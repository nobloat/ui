// Package browser drives headless Chrome and Firefox from Go, with nothing but the standard library: Chrome over the
// DevTools protocol, Firefox over WebDriver BiDi, both through the browser's own debugging port (no driver binaries).
// Each tab is its own window, so none is throttled in the background. Dark is fixed per browser at launch, reduced
// motion always.
//
//	b, err := browser.Launch("firefox", true) // dark
//	t, err := b.NewTab()
//	t.Size(320, 900); t.Navigate("file:///…/index.html")
//	var n int; t.Eval(`document.querySelectorAll('button').length`, &n)
package browser

import (
	"bufio"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"time"
)

// Names are the browsers Launch knows.
var Names = []string{"chrome", "firefox"}

type Browser struct {
	Name string
	Dark bool
	proc *exec.Cmd
	dir  string
	ws   *ws
	mu   sync.Mutex
	id   int
	wait map[int]chan reply
	fmu  sync.Mutex                                             // Focused
	subs map[string]func(method string, params json.RawMessage) // by CDP session
}

type reply struct {
	res json.RawMessage
	err error
}

// Path finds a browser: $CHROME or $FIREFOX, the usual install places, then PATH.
func Path(name string) string {
	if p := os.Getenv(strings.ToUpper(name)); p != "" {
		return p
	}
	home, _ := os.UserHomeDir()
	places := map[string][]string{
		"chrome": {"C:/Program Files/Google/Chrome/Application/chrome.exe", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
			"/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"},
		"firefox": {"C:/Program Files/Mozilla Firefox/firefox.exe", filepath.Join(home, "scoop/apps/firefox/current/firefox.exe"),
			"/Applications/Firefox.app/Contents/MacOS/firefox", "/usr/bin/firefox"},
	}
	for _, p := range places[name] {
		if _, err := os.Stat(p); err == nil {
			return p
		}
	}
	for _, n := range map[string][]string{"chrome": {"google-chrome", "chromium", "chrome"}, "firefox": {"firefox"}}[name] {
		if p, err := exec.LookPath(n); err == nil {
			return p
		}
	}
	return ""
}

var listening = regexp.MustCompile(`listening on (ws://\S+)`)

// Launch starts a headless browser ("chrome" or "firefox") with its own temporary profile.
func Launch(name string, dark bool) (*Browser, error) {
	bin := Path(name)
	if bin == "" {
		return nil, fmt.Errorf("%s not found: set %s", name, strings.ToUpper(name))
	}
	dir, err := os.MkdirTemp("", "nbui-"+name+"-")
	if err != nil {
		return nil, err
	}
	var args []string
	switch name {
	case "chrome":
		args = []string{"--headless", "--disable-gpu", "--hide-scrollbars", "--force-prefers-reduced-motion", "--no-first-run",
			"--no-default-browser-check", "--remote-debugging-port=0", "--user-data-dir=" + dir, "about:blank"}
	case "firefox":
		scheme := 1 // light
		if dark {
			scheme = 0
		}
		prefs := fmt.Sprintf(`user_pref("layout.css.prefers-color-scheme.content-override", %d);
user_pref("ui.prefersReducedMotion", 1);
user_pref("focusmanager.testmode", true); // every window counts as focused, like Chrome's focus emulation
user_pref("ui.useOverlayScrollbars", 1);
user_pref("browser.shell.checkDefaultBrowser", false);
user_pref("datareporting.policy.dataSubmissionEnabled", false);
user_pref("toolkit.telemetry.reportingpolicy.firstRun", false);
user_pref("browser.startup.homepage_override.mstone", "ignore");
`, scheme)
		if err := os.WriteFile(filepath.Join(dir, "user.js"), []byte(prefs), 0o600); err != nil {
			return nil, err
		}
		l, err := net.Listen("tcp", "127.0.0.1:0") // a free port (Firefox does not take 0)
		if err != nil {
			return nil, err
		}
		port := l.Addr().(*net.TCPAddr).Port
		l.Close()
		args = []string{"--headless", "--no-remote", "--profile", dir, "--remote-debugging-port", fmt.Sprint(port), "about:blank"}
	default:
		return nil, fmt.Errorf("unknown browser %q (chrome, firefox)", name)
	}
	cmd := exec.Command(bin, args...)
	stderr, _ := cmd.StderrPipe()
	if err := cmd.Start(); err != nil {
		return nil, err
	}
	b := &Browser{Name: name, Dark: dark, proc: cmd, dir: dir, wait: map[int]chan reply{}, subs: map[string]func(string, json.RawMessage){}}
	found := make(chan string, 1)
	go func() { // the debugging address is announced on stderr; drain the rest
		s := bufio.NewScanner(stderr)
		for s.Scan() {
			if m := listening.FindStringSubmatch(s.Text()); m != nil {
				select {
				case found <- m[1]:
				default:
				}
			}
		}
	}()
	var addr string
	select {
	case addr = <-found:
	case <-time.After(30 * time.Second):
		b.Close()
		return nil, fmt.Errorf("%s did not start", name)
	}
	if name == "firefox" {
		addr = strings.TrimSuffix(addr, "/") + "/session"
	}
	if b.ws, err = dial(addr); err != nil {
		b.Close()
		return nil, err
	}
	go b.loop()
	if name == "firefox" {
		if _, err := b.call("session.new", map[string]any{"capabilities": map[string]any{}}, ""); err != nil {
			b.Close()
			return nil, err
		}
	}
	return b, nil
}

func (b *Browser) loop() {
	for {
		p, err := b.ws.read()
		if err != nil {
			b.mu.Lock()
			for id, c := range b.wait {
				c <- reply{err: errors.New(b.Name + " closed")}
				delete(b.wait, id)
			}
			b.mu.Unlock()
			return
		}
		var m struct {
			ID      int             `json:"id"`
			Type    string          `json:"type"`
			Method  string          `json:"method"`
			Params  json.RawMessage `json:"params"`
			Session string          `json:"sessionId"`
			Result  json.RawMessage `json:"result"`
			Error   json.RawMessage `json:"error"`
			Message string          `json:"message"`
		}
		if json.Unmarshal(p, &m) != nil {
			continue
		}
		if m.ID == 0 || m.Type == "event" {
			b.mu.Lock()
			f := b.subs[m.Session]
			b.mu.Unlock()
			if f != nil && m.Method != "" {
				f(m.Method, m.Params)
			}
			continue
		}
		r := reply{res: m.Result}
		if len(m.Error) > 0 && string(m.Error) != "null" {
			r.err = fmt.Errorf("%s %s", m.Error, m.Message)
		}
		b.mu.Lock()
		c := b.wait[m.ID]
		delete(b.wait, m.ID)
		b.mu.Unlock()
		if c != nil {
			c <- r
		}
	}
}

// call sends one command; session is the CDP session of a tab ("" for the browser and for BiDi).
func (b *Browser) call(method string, params any, session string) (json.RawMessage, error) {
	b.mu.Lock()
	b.id++
	id := b.id
	c := make(chan reply, 1)
	b.wait[id] = c
	b.mu.Unlock()
	m := map[string]any{"id": id, "method": method, "params": params}
	if session != "" {
		m["sessionId"] = session
	}
	p, _ := json.Marshal(m)
	if err := b.ws.send(p); err != nil {
		return nil, err
	}
	select {
	case r := <-c:
		if r.err != nil {
			return nil, fmt.Errorf("%s %s: %w", b.Name, method, r.err)
		}
		return r.res, nil
	case <-time.After(60 * time.Second):
		b.mu.Lock()
		delete(b.wait, id)
		b.mu.Unlock()
		return nil, fmt.Errorf("%s %s: no answer in 60 s", b.Name, method)
	}
}

// Close ends the browser and removes its profile.
func (b *Browser) Close() {
	if b.ws != nil {
		done := make(chan struct{})
		go func() {
			if b.Name == "firefox" {
				b.call("browser.close", map[string]any{}, "")
			} else {
				b.call("Browser.close", map[string]any{}, "")
			}
			close(done)
		}()
		select {
		case <-done:
		case <-time.After(5 * time.Second):
		}
		b.ws.close()
	}
	exited := make(chan struct{})
	go func() { b.proc.Wait(); close(exited) }()
	select {
	case <-exited:
	case <-time.After(5 * time.Second):
		b.proc.Process.Kill()
		<-exited
	}
	for range 10 { // Windows keeps files locked a moment after exit
		if os.RemoveAll(b.dir) == nil {
			break
		}
		time.Sleep(200 * time.Millisecond)
	}
}

// Tab is one page in its own window.
type Tab struct {
	b  *Browser
	id string // CDP session or BiDi browsing context
	mu sync.Mutex
	on map[string]func(json.RawMessage)
}

func (b *Browser) NewTab() (*Tab, error) {
	t := &Tab{b: b, on: map[string]func(json.RawMessage){}}
	if b.Name == "firefox" {
		var r struct{ Context string }
		res, err := b.call("browsingContext.create", map[string]any{"type": "window"}, "")
		if err == nil {
			err = json.Unmarshal(res, &r)
		}
		t.id = r.Context
		return t, err
	}
	var target struct{ TargetID string }
	res, err := b.call("Target.createTarget", map[string]any{"url": "about:blank", "newWindow": true}, "")
	if err != nil {
		return nil, err
	}
	json.Unmarshal(res, &target)
	var s struct{ SessionID string }
	if res, err = b.call("Target.attachToTarget", map[string]any{"targetId": target.TargetID, "flatten": true}, ""); err != nil {
		return nil, err
	}
	json.Unmarshal(res, &s)
	t.id = s.SessionID
	b.mu.Lock()
	b.subs[t.id] = func(method string, p json.RawMessage) {
		t.mu.Lock()
		f := t.on[method]
		t.mu.Unlock()
		if f != nil {
			f(p)
		}
	}
	b.mu.Unlock()
	scheme := "light"
	if b.Dark {
		scheme = "dark"
	}
	for _, c := range []struct {
		m string
		p any
	}{
		{"Page.enable", map[string]any{}},
		{"Emulation.setFocusEmulationEnabled", map[string]any{"enabled": true}}, // a page without OS focus still shows focus
		{"Emulation.setEmulatedMedia", map[string]any{"features": []map[string]string{{"name": "prefers-color-scheme", "value": scheme}, {"name": "prefers-reduced-motion", "value": "reduce"}}}},
	} {
		if _, err := t.Call(c.m, c.p); err != nil {
			return nil, err
		}
	}
	return t, nil
}

// Call sends a raw protocol command for this tab (CDP on Chrome; on Firefox the caller adds the context).
func (t *Tab) Call(method string, params any) (json.RawMessage, error) {
	if t.b.Name == "firefox" {
		return t.b.call(method, params, "")
	}
	return t.b.call(method, params, t.id)
}

// On registers a handler for a CDP event of this tab (Chrome only).
func (t *Tab) On(method string, f func(json.RawMessage)) {
	t.mu.Lock()
	t.on[method] = f
	t.mu.Unlock()
}

func (t *Tab) Browser() *Browser { return t.b }

// Focused runs f while this tab holds the browser's focus, one tab at a time: focus, :focus-visible and key input need
// the focused window (Chrome emulates focus per tab; Firefox has one focused window).
func (t *Tab) Focused(f func() error) error {
	if t.b.Name != "firefox" {
		return f()
	}
	t.b.fmu.Lock()
	defer t.b.fmu.Unlock()
	if _, err := t.b.call("browsingContext.activate", map[string]any{"context": t.id}, ""); err != nil {
		return err
	}
	return f()
}

// Navigate loads url and waits for the load event, the fonts and two frames.
func (t *Tab) Navigate(url string) error {
	if t.b.Name == "firefox" {
		if _, err := t.b.call("browsingContext.navigate", map[string]any{"context": t.id, "url": url, "wait": "complete"}, ""); err != nil {
			return err
		}
	} else {
		loaded := make(chan struct{}, 1)
		t.On("Page.loadEventFired", func(json.RawMessage) {
			select {
			case loaded <- struct{}{}:
			default:
			}
		})
		var r struct{ ErrorText string }
		for try := range 2 { // a navigation the page started itself (a click, a redirect) aborts ours once
			res, err := t.Call("Page.navigate", map[string]any{"url": url})
			if err != nil {
				return err
			}
			r.ErrorText = ""
			json.Unmarshal(res, &r)
			if r.ErrorText != "net::ERR_ABORTED" || try == 1 {
				break
			}
			time.Sleep(300 * time.Millisecond)
		}
		if r.ErrorText != "" {
			return fmt.Errorf("chrome: %s: %s", url, r.ErrorText)
		}
		select {
		case <-loaded:
		case <-time.After(30 * time.Second):
			return fmt.Errorf("chrome: %s: no load event in 30 s", url)
		}
	}
	return t.Settle()
}

// Settle waits for the fonts and two frames (at most a second).
func (t *Tab) Settle() error {
	return t.Eval(`Promise.race([document.fonts.ready.then(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))), new Promise(r => setTimeout(r, 1000))])`, nil)
}

// Eval runs a JavaScript expression (a promise is awaited) and decodes its JSON value into out (nil: ignore it).
func (t *Tab) Eval(expr string, out any) error {
	wrapped := "(async () => JSON.stringify((await (" + expr + ")) ?? null))()"
	var s string
	if t.b.Name == "firefox" {
		res, err := t.b.call("script.evaluate", map[string]any{"expression": wrapped, "target": map[string]string{"context": t.id}, "awaitPromise": true}, "")
		if err != nil {
			return err
		}
		var r struct {
			Type             string
			Result           struct{ Value string }
			ExceptionDetails json.RawMessage
		}
		json.Unmarshal(res, &r)
		if r.Type != "success" {
			return fmt.Errorf("firefox: %s", trim(r.ExceptionDetails))
		}
		s = r.Result.Value
	} else {
		res, err := t.Call("Runtime.evaluate", map[string]any{"expression": wrapped, "awaitPromise": true, "returnByValue": true})
		if err != nil {
			return err
		}
		var r struct {
			Result           struct{ Value string }
			ExceptionDetails json.RawMessage
		}
		json.Unmarshal(res, &r)
		if len(r.ExceptionDetails) > 0 {
			return fmt.Errorf("chrome: %s", trim(r.ExceptionDetails))
		}
		s = r.Result.Value
	}
	if out == nil {
		return nil
	}
	return json.Unmarshal([]byte(s), out)
}

func trim(p []byte) string {
	if len(p) > 400 {
		p = p[:400]
	}
	return string(p)
}

// Size sets the viewport in CSS pixels; Chrome treats a width under 640 as a phone.
func (t *Tab) Size(w, h int) error {
	if t.b.Name == "firefox" {
		_, err := t.b.call("browsingContext.setViewport", map[string]any{"context": t.id, "viewport": map[string]int{"width": w, "height": h}, "devicePixelRatio": 1}, "")
		return err
	}
	_, err := t.Call("Emulation.setDeviceMetricsOverride", map[string]any{"width": w, "height": h, "deviceScaleFactor": 1, "mobile": w < 640})
	return err
}

// Screenshot returns the viewport as PNG.
func (t *Tab) Screenshot() ([]byte, error) {
	var res json.RawMessage
	var err error
	if t.b.Name == "firefox" {
		res, err = t.b.call("browsingContext.captureScreenshot", map[string]any{"context": t.id}, "")
	} else {
		res, err = t.Call("Page.captureScreenshot", map[string]any{"format": "png"})
	}
	if err != nil {
		return nil, err
	}
	var r struct{ Data string }
	json.Unmarshal(res, &r)
	return base64.StdEncoding.DecodeString(r.Data)
}

// Type types text into the focused element, as one insertion.
func (t *Tab) Type(text string) error {
	if t.b.Name == "firefox" {
		var a []map[string]string
		for _, r := range text {
			a = append(a, map[string]string{"type": "keyDown", "value": string(r)}, map[string]string{"type": "keyUp", "value": string(r)})
		}
		return t.actions(map[string]any{"type": "key", "id": "kb", "actions": a})
	}
	_, err := t.Call("Input.insertText", map[string]any{"text": text})
	return err
}

// keys: name → BiDi value, CDP code, Windows key code, text it types.
var keys = map[string]struct {
	bidi, code string
	vk         int
	text       string
}{
	"Enter": {"\uE007", "Enter", 13, "\r"}, "Backspace": {"\uE003", "Backspace", 8, ""}, "Escape": {"\uE00C", "Escape", 27, ""},
	"Tab": {"\uE004", "Tab", 9, ""}, " ": {" ", "Space", 32, " "}, "Control": {"\uE009", "ControlLeft", 17, ""},
}

// Key presses one key, optionally with Control: "Enter", "Escape", "Backspace", "Tab", " ", "a", "Control+k".
func (t *Tab) Key(k string) error {
	ctrl := strings.HasPrefix(k, "Control+")
	k = strings.TrimPrefix(k, "Control+")
	d, ok := keys[k]
	if !ok { // a letter
		d.bidi, d.code, d.vk, d.text = k, "Key"+strings.ToUpper(k), int(strings.ToUpper(k)[0]), k
	}
	if t.b.Name == "firefox" {
		var a []map[string]string
		if ctrl {
			a = append(a, map[string]string{"type": "keyDown", "value": keys["Control"].bidi})
		}
		a = append(a, map[string]string{"type": "keyDown", "value": d.bidi}, map[string]string{"type": "keyUp", "value": d.bidi})
		if ctrl {
			a = append(a, map[string]string{"type": "keyUp", "value": keys["Control"].bidi})
		}
		return t.actions(map[string]any{"type": "key", "id": "kb", "actions": a})
	}
	mods, down, text := 0, "keyDown", d.text
	if ctrl {
		mods, down, text = 2, "rawKeyDown", ""
	} else if text == "" {
		down = "rawKeyDown"
	}
	for _, typ := range []string{down, "keyUp"} {
		p := map[string]any{"type": typ, "key": k, "code": d.code, "modifiers": mods, "windowsVirtualKeyCode": d.vk}
		if typ != "keyUp" && text != "" {
			p["text"] = text
		}
		if _, err := t.Call("Input.dispatchKeyEvent", p); err != nil {
			return err
		}
	}
	return nil
}

// Move moves the mouse to x, y (viewport pixels).
func (t *Tab) Move(x, y float64) error {
	if t.b.Name == "firefox" {
		return t.actions(pointer([]map[string]any{{"type": "pointerMove", "x": int(x), "y": int(y)}}))
	}
	_, err := t.Call("Input.dispatchMouseEvent", map[string]any{"type": "mouseMoved", "x": x, "y": y})
	return err
}

// Click clicks at x, y.
func (t *Tab) Click(x, y float64) error {
	if t.b.Name == "firefox" {
		return t.actions(pointer([]map[string]any{{"type": "pointerMove", "x": int(x), "y": int(y)}, {"type": "pointerDown", "button": 0}, {"type": "pointerUp", "button": 0}}))
	}
	for _, typ := range []string{"mousePressed", "mouseReleased"} {
		if _, err := t.Call("Input.dispatchMouseEvent", map[string]any{"type": typ, "x": x, "y": y, "button": "left", "clickCount": 1}); err != nil {
			return err
		}
	}
	return nil
}

func pointer(a []map[string]any) map[string]any {
	return map[string]any{"type": "pointer", "id": "mouse", "parameters": map[string]string{"pointerType": "mouse"}, "actions": a}
}

func (t *Tab) actions(source map[string]any) error {
	_, err := t.b.call("input.performActions", map[string]any{"context": t.id, "actions": []any{source}}, "")
	return err
}
