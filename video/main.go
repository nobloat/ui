// The typed UI demo: records headless Chrome over the DevTools protocol (Page.startScreencast; Firefox has no screencast)
// and encodes the frames to an animated GIF with the standard library (no ffmpeg):
//
//	go run ./video video/demo.gif      # in ui; make video
//
// A caption bar and a visible cursor are injected into every page; mouse and keys move at human pace. Slides
// (slides.html?<name>) type out code and real terminal output; phone.html frames a page at phone width.
package main

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"image"
	"image/color"
	"image/draw"
	"image/gif"
	"image/jpeg"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/nobloat/ui/browser"
)

const w, h = 1280, 720

// overlay: a caption bar at the bottom and a cursor that follows the mouse; window.__cap(text) sets the caption.
const overlay = `if (window === top) addEventListener('DOMContentLoaded', () => {
  const s = document.createElement('style'); s.textContent = '#__cap{position:fixed;left:0;right:0;bottom:0;z-index:2147483647;padding:12px 24px;background:rgba(24,25,27,.92);color:#f6f6f5;font:600 18px/1.4 ui-monospace,Consolas,monospace;text-align:center}#__cap:empty{display:none}#__cur{position:fixed;z-index:2147483647;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%;background:rgba(220,38,38,.55);border:2px solid #fff;pointer-events:none;left:-40px;top:-40px;transition:transform .1s}#__cur.down{transform:scale(.7)}body:has(.card,.code,.phone) #__cur{display:none}';
  document.head.append(s);
  const c = document.createElement('div'); c.id = '__cap'; c.textContent = sessionStorage.getItem('__cap') || ''; document.body.append(c);
  const k = document.createElement('div'); k.id = '__cur'; document.body.append(k);
  const p = JSON.parse(sessionStorage.getItem('__xy') || '[-40,-40]'); k.style.left = p[0] + 'px'; k.style.top = p[1] + 'px';
  addEventListener('mousemove', e => { k.style.left = e.clientX + 'px'; k.style.top = e.clientY + 'px'; sessionStorage.setItem('__xy', JSON.stringify([e.clientX, e.clientY])); }, true);
  addEventListener('mousedown', () => k.classList.add('down'), true); addEventListener('mouseup', () => k.classList.remove('down'), true);
  window.__cap = t => { sessionStorage.setItem('__cap', t); c.textContent = t; };
});`

type frame struct {
	jpg []byte
	ms  int
}

func main() {
	if len(os.Args) != 2 {
		fmt.Fprintln(os.Stderr, "usage: go run ./video <out.gif>   (in ui)")
		os.Exit(2)
	}
	frames, err := record()
	if err == nil {
		err = encode(frames, os.Args[1])
	}
	if err != nil {
		fmt.Fprintln(os.Stderr, "video:", err)
		os.Exit(1)
	}
}

// demo is the story, step by step.
type demo struct {
	t  *browser.Tab
	xy [2]float64
}

func (d *demo) must(err error) {
	if err != nil {
		panic(err)
	}
}

func (d *demo) js(expr string, out any) { d.must(d.t.Eval(expr, out)) }

func (d *demo) goTo(path, caption string) {
	q, _ := json.Marshal(caption)
	d.t.Eval(`(() => { try { sessionStorage.setItem('__cap', `+string(q)+`) } catch {} })()`, nil)
	i := strings.IndexAny(path+"?", "?#")
	p, rest := path[:i], path[min(i, len(path)):]
	abs, _ := filepath.Abs(p)
	abs = filepath.ToSlash(abs)
	if !strings.HasPrefix(abs, "/") {
		abs = "/" + abs
	}
	u := (&url.URL{Scheme: "file", Path: abs}).String()
	u += rest
	d.must(d.t.Navigate(u))
	time.Sleep(150 * time.Millisecond)
	d.js(`window.__cap && __cap(`+string(q)+`)`, nil)
	d.js(fmt.Sprintf(`(() => { const c = document.getElementById('__cur'); if (c) { c.style.left = '%fpx'; c.style.top = '%fpx'; } })()`, d.xy[0], d.xy[1]), nil)
}

func (d *demo) caption(t string) {
	q, _ := json.Marshal(t)
	d.js(`__cap(`+string(q)+`)`, nil)
}

func (d *demo) box(sel string) [2]float64 {
	q, _ := json.Marshal(sel)
	var p [2]float64
	d.js(`(() => { const e = document.querySelector(`+string(q)+`); e.scrollIntoView({block: 'center'}); const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; })()`, &p)
	return p
}

// move: a straight line in 12 steps, like a hand.
func (d *demo) move(to [2]float64) {
	for i := 1; i <= 12; i++ {
		f := float64(i) / 12
		d.must(d.t.Move(d.xy[0]+(to[0]-d.xy[0])*f, d.xy[1]+(to[1]-d.xy[1])*f))
		time.Sleep(25 * time.Millisecond)
	}
	d.xy = to
}

func (d *demo) click(sel string) {
	d.move(d.box(sel))
	time.Sleep(200 * time.Millisecond)
	d.must(d.t.Click(d.xy[0], d.xy[1]))
	time.Sleep(80 * time.Millisecond)
}

func (d *demo) typ(s string) {
	for _, r := range s {
		d.must(d.t.Type(string(r)))
		time.Sleep(90 * time.Millisecond)
	}
}

func (d *demo) key(k string) { d.must(d.t.Key(k)) }

// done waits for a slide to finish typing (data-done).
func (d *demo) done() {
	d.js(`new Promise(r => { const t = setInterval(() => { if (document.body.dataset.done !== undefined) { clearInterval(t); r(true); } }, 50); })`, nil)
}

func sleep(ms int) { time.Sleep(time.Duration(ms) * time.Millisecond) }

func record() (frames []frame, err error) {
	b, err := browser.Launch("chrome", false)
	if err != nil {
		return nil, err
	}
	defer b.Close()
	t, err := b.NewTab()
	if err != nil {
		return nil, err
	}
	defer func() {
		if p := recover(); p != nil {
			err = fmt.Errorf("%v", p)
		}
	}()
	var mu sync.Mutex
	t.On("Page.screencastFrame", func(p json.RawMessage) {
		var f struct {
			Data      string
			SessionID int
			Metadata  struct{ Timestamp float64 }
		}
		json.Unmarshal(p, &f)
		jpg, _ := base64.StdEncoding.DecodeString(f.Data)
		mu.Lock()
		frames = append(frames, frame{jpg, int(f.Metadata.Timestamp * 1000)})
		mu.Unlock()
		go t.Call("Page.screencastFrameAck", map[string]any{"sessionId": f.SessionID})
	})
	d := &demo{t: t, xy: [2]float64{w / 2, h / 2}}
	_, err = t.Call("Page.addScriptToEvaluateOnNewDocument", map[string]any{"source": overlay})
	d.must(err)
	d.must(t.Size(w, h))
	_, err = t.Call("Page.startScreencast", map[string]any{"format": "jpeg", "quality": 85, "maxWidth": w, "maxHeight": h})
	d.must(err)

	d.goTo("video/slides.html?title", "")
	sleep(3000)
	d.goTo("video/slides.html?code", "")
	d.done()
	sleep(3500)

	d.goTo("screens/auth/login-wrong.html", "ui renders it: the error sits at its field, linked for screen readers")
	sleep(1200)
	d.click("input[name=password]")
	d.typ("correct horse")
	sleep(1500)
	d.goTo("screens/auth/setup.html", "Every auth screen is a Go value: the second step, with its QR code")
	sleep(2500)
	d.goTo("screens/auth/users.html", "Lists: filter chips, a sortable table, a pager")
	sleep(800)
	d.move(d.box("tbody tr:nth-child(2) a"))
	sleep(1800)
	d.goTo("screens/auth/user.html", "Menus are native popovers: no script")
	sleep(800)
	d.click("button[popovertarget=nb-more]")
	sleep(2200)
	d.key("Escape")
	sleep(400)

	d.goTo("blocks.html#st-w", "Behaviour with settings is a custom element: <nb-editable> saves on its own")
	sleep(600)
	d.click(`#st-w nb-editable[label="Reminder after"] button`)
	sleep(400)
	d.key("Control+a")
	d.typ("21")
	sleep(300)
	d.key("Enter")
	sleep(3200)

	d.goTo("showcase/sample/dashboard.html", "An app page: header, nav, stat tiles, cards. Ctrl K opens the commands")
	sleep(1500)
	d.key("Control+k")
	sleep(700)
	d.typ("inv")
	sleep(1500)
	d.key("Escape")
	sleep(300)
	_, err = t.Call("Emulation.setEmulatedMedia", map[string]any{"features": []map[string]string{{"name": "prefers-color-scheme", "value": "dark"}}})
	d.must(err)
	d.caption("Light and dark come from the same tokens")
	sleep(2500)
	_, err = t.Call("Emulation.setEmulatedMedia", map[string]any{"features": []map[string]string{{"name": "prefers-color-scheme", "value": "light"}}})
	d.must(err)
	d.goTo("video/phone.html?../screens/auth/account.html", "Phones: the same page, one column")
	sleep(3000)

	for _, s := range []string{"rules", "copy", "other"} {
		d.goTo("video/slides.html?"+s, "")
		d.done()
		sleep(3500)
	}
	d.goTo("video/slides.html?end", "")
	sleep(3000)
	_, err = t.Call("Page.stopScreencast", map[string]any{})
	d.must(err)
	sleep(300)
	mu.Lock()
	defer mu.Unlock()
	return frames, nil
}

// encode: at most 15 frames a second, each lasting until the next; smaller frames (a phone) sit centred on the canvas;
// colours map to a fixed palette (grays for text, a colour cube for the rest); each frame stores only the rectangle
// that changed.
func encode(frames []frame, out string) error {
	const minGap = 66 // ms between kept frames
	var keep []frame
	for i, f := range frames {
		if len(keep) == 0 || f.ms-keep[len(keep)-1].ms >= minGap || i == len(frames)-1 {
			keep = append(keep, f)
		}
	}
	pal := palette()
	cache := map[color.RGBA]uint8{}
	bg := uint8(pal.Index(color.RGBA{0xe5, 0xe5, 0xe4, 0xff}))
	var prev *image.Paletted
	g := &gif.GIF{Config: image.Config{ColorModel: pal, Width: w, Height: h}}
	for i, f := range keep {
		delay := 300 // the last frame: 3 s
		if i+1 < len(keep) {
			delay = keep[i+1].ms - f.ms
		}
		src, err := jpeg.Decode(bytes.NewReader(f.jpg))
		if err != nil {
			return err
		}
		cur := image.NewPaletted(image.Rect(0, 0, w, h), pal)
		for p := range cur.Pix {
			cur.Pix[p] = bg
		}
		b := src.Bounds()
		off := image.Pt((w-b.Dx())/2, (h-b.Dy())/2)
		for y := b.Min.Y; y < b.Max.Y && y-b.Min.Y+off.Y < h; y++ {
			for x := b.Min.X; x < b.Max.X && x-b.Min.X+off.X < w; x++ {
				r, g, bl, _ := src.At(x, y).RGBA()
				c := color.RGBA{uint8(r >> 8), uint8(g >> 8), uint8(bl >> 8), 0xff}
				idx, ok := cache[c]
				if !ok {
					idx = uint8(pal.Index(c))
					cache[c] = idx
				}
				cur.Pix[(y-b.Min.Y+off.Y)*cur.Stride+x-b.Min.X+off.X] = idx
			}
		}
		rect := cur.Bounds()
		if prev != nil {
			rect = changed(prev, cur)
			if rect.Empty() { // nothing moved: the previous frame lasts longer
				g.Delay[len(g.Delay)-1] += max(1, delay/10)
				continue
			}
		}
		sub := image.NewPaletted(rect, pal)
		draw.Draw(sub, rect, cur, rect.Min, draw.Src)
		g.Image = append(g.Image, sub)
		g.Delay = append(g.Delay, max(2, delay/10))
		g.Disposal = append(g.Disposal, gif.DisposalNone)
		prev = cur
	}
	o, err := os.Create(out)
	if err != nil {
		return err
	}
	if err := gif.EncodeAll(o, g); err != nil {
		o.Close()
		return err
	}
	fmt.Printf("%d of %d frames → %s\n", len(g.Image), len(frames), out)
	return o.Close()
}

// palette: 40 grays (text, lines, surfaces) and a 6×6×6 colour cube.
func palette() color.Palette {
	var p color.Palette
	for i := range 40 {
		v := uint8(i * 255 / 39)
		p = append(p, color.RGBA{v, v, v, 0xff})
	}
	for r := range 6 {
		for g := range 6 {
			for b := range 6 {
				p = append(p, color.RGBA{uint8(r * 51), uint8(g * 51), uint8(b * 51), 0xff})
			}
		}
	}
	return p
}

// changed: the smallest rectangle that holds every pixel that differs.
func changed(a, b *image.Paletted) image.Rectangle {
	r := image.Rectangle{}
	for y := range h {
		row := y * a.Stride
		for x := range w {
			if a.Pix[row+x] != b.Pix[row+x] {
				r = r.Union(image.Rect(x, y, x+1, y+1))
			}
		}
	}
	return r
}
