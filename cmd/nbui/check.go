package main

// nbui check: layout and accessibility of every example page and the design system pages, or of an app's pages, in
// Chrome and Firefox (skill/nobloat → Browsers). Each browser runs light and dark as two instances with several tabs;
// a page loads once per design and theme and steps through the widths (and the open burger menu on phones).
//
//	go run ./cmd/nbui check                                     # ui: every page × graphite/paper × light/dark × widths
//	go run ./cmd/nbui check -pages ui:blocks,list -browsers firefox
//	go -C ../ui run ./cmd/nbui check http://127.0.0.1:8080/ /customers /customers/CUS-0042   # an app's pages
//
// It fails on what check.js finds: layout (sideways scroll, sticking out, wrapping one-line parts, clipped text), a11y
// (contrast, names, labels, alt, ids, landmarks, target size, focus), sr (roles, linked errors, icons, aria-current,
// aria-sort, headings, skip link), icons on buttons; and on the picker and money behaviour of ui.js.

import (
	_ "embed"
	"flag"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"slices"
	"strings"
	"sync"
	"time"

	"github.com/nobloat/ui/browser"
)

//go:embed check.js
var checkJS string

var (
	examplePages = []string{"index", "icons", "400", "401", "403", "404", "409", "410", "413", "429", "500", "503", "dashboard", "list",
		"detail", "form", "dates", "week", "month", "settings", "status", "login",
		// the design system pages in the repo root, once per theme and width (they have no design switch)
		"ui:index", "ui:foundations", "ui:components", "ui:blocks", "ui:shell", "ui:documents", "ui:proposals"}
	widths = []int{320, 360, 375, 390, 414, 430, 768, 1280}
)

func fileURL(path string) string {
	abs, _ := filepath.Abs(path)
	abs = filepath.ToSlash(abs)
	if !strings.HasPrefix(abs, "/") {
		abs = "/" + abs // C:/…
	}
	return (&url.URL{Scheme: "file", Path: abs}).String()
}

// report collects problems; identical messages are grouped with every place they occur.
type report struct {
	mu    sync.Mutex
	seen  map[string][]string
	runs  int
	fatal []string
}

func (r *report) add(where string, msgs ...string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.runs++
	for _, m := range msgs {
		r.seen[m] = append(r.seen[m], where)
	}
}

func (r *report) fail(where string, err error) {
	r.mu.Lock()
	r.fatal = append(r.fatal, where+": "+err.Error())
	r.mu.Unlock()
}

func check(args []string) int {
	flags := flag.NewFlagSet("check", flag.ExitOnError)
	browsers := flags.String("browsers", strings.Join(browser.Names, ","), "browsers to run")
	only := flags.String("pages", "", "only these pages, as list,ui:blocks (ui's own pages)")
	designs := flags.String("designs", ",paper", "designs of the example pages (empty: graphite)")
	tabs := flags.Int("tabs", 3, "tabs per browser")
	flags.Usage = func() {
		fmt.Fprintln(os.Stderr, "usage: nbui check [flags] [<base url> <paths>…]")
		flags.PrintDefaults()
	}
	flags.Parse(args)
	app := flags.Args()
	pages, ds := examplePages, strings.Split(*designs, ",")
	if len(app) > 0 {
		pages, ds = append([]string{""}, app[1:]...), []string{""}
	}
	if *only != "" {
		pages = slices.DeleteFunc(slices.Clone(pages), func(p string) bool { return !slices.Contains(strings.Split(*only, ","), p) })
	}
	root := fileURL(".") + "/"
	src, err := os.ReadFile("ui.js")
	if err != nil && len(app) == 0 {
		fmt.Fprintln(os.Stderr, "nbui check: run it in ui (go -C ../ui run ./cmd/nbui check …)")
		return 2
	}
	money := regexp.MustCompile(`window\.money = (\{[\s\S]*?\n\});`).FindSubmatch(src)

	start := time.Now()
	r := &report{seen: map[string][]string{}}
	var wg sync.WaitGroup
	for _, name := range strings.Split(*browsers, ",") {
		for _, theme := range []string{"light", "dark"} {
			wg.Add(1)
			go func() {
				defer wg.Done()
				b, err := browser.Launch(name, theme == "dark")
				if err != nil {
					r.fail(name, err)
					return
				}
				defer b.Close()
				type job struct{ page, design string }
				jobs := make(chan job)
				var tw sync.WaitGroup
				for i := range *tabs {
					t, err := b.NewTab()
					if err != nil {
						r.fail(name, err)
						break
					}
					if i == 0 && theme == "light" && len(app) == 0 { // once per browser: ui.js without a page of its own
						if money != nil {
							var bad []string
							if err := t.Eval("("+checkJS+").money("+string(money[1])+")", &bad); err != nil {
								r.fail(name+" money", err)
							} else if len(bad) > 0 {
								r.add(name+" money", "money: "+strings.Join(bad, " "))
							}
						}
						if slices.Contains(pages, "form") || *only == "" {
							if err := t.Focused(func() error { return picker(t, root, r) }); err != nil {
								r.fail(name+" picker", err)
							}
						}
					}
					tw.Add(1)
					go func() {
						defer tw.Done()
						for j := range jobs {
							if err := page(t, j.page, j.design, theme, root, app, r); err != nil {
								r.fail(fmt.Sprintf("%s %s %s %s", name, j.page, j.design, theme), err)
							}
						}
					}()
				}
				for _, d := range ds {
					for _, p := range pages {
						if strings.HasPrefix(p, "ui:") && d != ds[0] {
							continue
						}
						jobs <- job{p, d}
					}
				}
				close(jobs)
				tw.Wait()
			}()
		}
	}
	wg.Wait()

	msgs := make([]string, 0, len(r.seen))
	for m := range r.seen {
		msgs = append(msgs, m)
	}
	slices.Sort(msgs)
	for _, m := range msgs {
		where := r.seen[m]
		slices.Sort(where)
		w := strings.Join(where, ", ")
		if len(where) > 3 {
			w = strings.Join(where[:3], ", ") + fmt.Sprintf(" … (%d×)", len(where))
		}
		fmt.Printf("✕ %s\n    %s\n", m, w)
	}
	for _, f := range r.fatal {
		fmt.Println("✕ could not check:", f)
	}
	fmt.Printf("%d page checks in %s, %d distinct problems, %s\n", r.runs, *browsers, len(msgs), time.Since(start).Round(time.Second))
	if len(msgs) > 0 || len(r.fatal) > 0 {
		return 1
	}
	return 0
}

// page checks one page in one design and theme: every width from one load, then the open menu on phones, a custom
// logo (list) and long real data at 320 px (light).
func page(t *browser.Tab, p, design, theme, root string, app []string, r *report) error {
	sys := strings.HasPrefix(p, "ui:")
	at := func(logo bool) string {
		switch {
		case len(app) > 0:
			base, err := url.Parse(app[0])
			if err != nil {
				return app[0]
			}
			ref, _ := url.Parse(p)
			return base.ResolveReference(ref).String()
		case sys:
			return root + p[3:] + ".html"
		}
		l := ""
		if logo {
			l = "1"
		}
		return fmt.Sprintf("%sexamples/%s.html?nopanel&design=%s&brand=&logo=%s&theme=%s", root, p, design, l, theme)
	}
	specimens := p == "ui:blocks" || p == "ui:shell" || p == "ui:documents"
	name := t.Browser().Name
	where := func(w int, variant string) string {
		s := name + " " + p
		if p == "" {
			s = name + " /"
		}
		if len(app) == 0 && !sys {
			d := design
			if d == "" {
				d = "graphite"
			}
			s += " " + d
		}
		s += fmt.Sprintf(" %s %dpx", theme, w)
		if variant != "" {
			s += " " + variant
		}
		return s
	}
	probe := func(w int, variant string) error {
		var problems []string
		if err := t.Eval(fmt.Sprintf("(%s).probe(%v, %v)", checkJS, specimens, sys), &problems); err != nil {
			return err
		}
		if variant == "" && w == 1280 {
			var more []string
			if err := t.Focused(func() error { return t.Eval("("+checkJS+").focus()", &more) }); err != nil {
				return err
			}
			problems = append(problems, more...)
		}
		r.add(where(w, variant), problems...)
		return nil
	}
	load := func(w int, u string) error {
		if err := t.Size(w, 900); err != nil {
			return err
		}
		return t.Navigate(u)
	}
	if err := load(widths[0], at(false)); err != nil {
		return err
	}
	for _, w := range widths {
		if err := t.Size(w, 900); err != nil {
			return err
		}
		if err := t.Settle(); err != nil {
			return err
		}
		if err := probe(w, ""); err != nil {
			return err
		}
	}
	if !sys && p != "status" && p != "login" {
		if err := load(widths[0], at(false)); err != nil {
			return err
		}
		if err := t.Eval(`document.getElementById('menu')?.click()`, nil); err != nil {
			return err
		}
		for _, w := range widths {
			if w >= 640 {
				break
			}
			if err := t.Size(w, 900); err != nil {
				return err
			}
			if err := t.Settle(); err != nil {
				return err
			}
			if err := probe(w, "menu"); err != nil {
				return err
			}
		}
	}
	if p == "list" && len(app) == 0 {
		if err := load(320, at(true)); err != nil {
			return err
		}
		if err := probe(320, "logo"); err != nil {
			return err
		}
	}
	if theme == "light" {
		if err := load(320, at(false)); err != nil {
			return err
		}
		if err := t.Eval("("+checkJS+").stress()", nil); err != nil {
			return err
		}
		return probe(320, "long data")
	}
	return nil
}

// picker: the pill picker (input[data-pick]) on the form page: type and pick, type a new value, Backspace, ×, leave with
// typed text.
func picker(t *browser.Tab, root string, r *report) error {
	if err := t.Size(1280, 900); err != nil {
		return err
	}
	if err := t.Navigate(root + "examples/form.html?nopanel"); err != nil {
		return err
	}
	var got []string
	val := func() error {
		var v string
		err := t.Eval(`document.getElementById('f-tags').value`, &v)
		got = append(got, v)
		return err
	}
	steps := []func() error{
		func() error { return t.Eval(`document.querySelector('label[for=f-tags]').click()`, nil) },
		func() error { return t.Type("trav") }, func() error { return t.Key("Enter") }, val,
		func() error { return t.Type("#new") }, func() error { return t.Key(" ") }, val,
		func() error { return t.Key("Backspace") }, val,
		func() error { return t.Eval(`document.querySelector('.pill button').click()`, nil) }, val,
		func() error { return t.Type("#left") }, func() error { return t.Eval(`document.activeElement.blur()`, nil) },
		func() error { time.Sleep(300 * time.Millisecond); return nil }, val,
	}
	for _, s := range steps {
		if err := s(); err != nil {
			return err
		}
	}
	want := []string{"#consulting #eu #travel", "#consulting #eu #travel #new", "#consulting #eu #travel", "#eu #travel", "#eu #travel #left"}
	if !slices.Equal(got, want) {
		r.add(t.Browser().Name+" form", fmt.Sprintf("picker: got %q, want %q", got, want))
	}
	return nil
}
