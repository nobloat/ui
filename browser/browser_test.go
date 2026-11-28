package browser

import (
	"bytes"
	"testing"
)

// TestDrive: every browser on this machine loads a page, evaluates, resizes, types, presses keys, clicks and takes a
// screenshot, light and dark. A browser that is not installed is skipped.
func TestDrive(t *testing.T) {
	page := `data:text/html,<!doctype html><meta name=viewport content=width=device-width><title>t</title><input id=i autofocus><button id=b onclick="this.textContent='hit'">b</button>`
	for _, name := range Names {
		if Path(name) == "" {
			t.Logf("%s not installed: skipped", name)
			continue
		}
		for _, dark := range []bool{false, true} {
			b, err := Launch(name, dark)
			if err != nil {
				t.Fatal(err)
			}
			tab, err := b.NewTab()
			if err != nil {
				b.Close()
				t.Fatal(err)
			}
			check := func(what string, err error) {
				if err != nil {
					t.Errorf("%s dark=%v %s: %v", name, dark, what, err)
				}
			}
			check("size", tab.Size(320, 600))
			check("navigate", tab.Navigate(page))
			var got struct {
				W    int
				Dark bool
			}
			check("eval", tab.Eval(`({w: innerWidth, dark: matchMedia('(prefers-color-scheme: dark)').matches})`, &got))
			if got.W != 320 || got.Dark != dark {
				t.Errorf("%s: width %d dark %v, want 320 %v", name, got.W, got.Dark, dark)
			}
			check("focus", tab.Eval(`document.getElementById('i').focus()`, nil))
			check("type", tab.Type("ab"))
			check("key", tab.Key("Backspace"))
			check("key", tab.Key(" "))
			check("key", tab.Key("Control+a"))
			var v string
			check("eval", tab.Eval(`document.getElementById('i').value`, &v))
			if v != "a " {
				t.Errorf("%s: input %q, want %q", name, v, "a ")
			}
			var r [2]float64
			check("eval", tab.Eval(`(() => { const r = document.getElementById('b').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; })()`, &r))
			check("click", tab.Click(r[0], r[1]))
			check("eval", tab.Eval(`document.getElementById('b').textContent`, &v))
			if v != "hit" {
				t.Errorf("%s: click did not land: %q", name, v)
			}
			png, err := tab.Screenshot()
			check("screenshot", err)
			if !bytes.HasPrefix(png, []byte("\x89PNG")) {
				t.Errorf("%s: screenshot is not a PNG", name)
			}
			if err := tab.Eval(`nope.nope`, nil); err == nil {
				t.Errorf("%s: an exception is not an error", name)
			}
			b.Close()
		}
	}
}
