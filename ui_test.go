package ui

// Renders pages/*.html through partials.html into examples/*.html, so the examples are the partials in use.
// `go test` fails when an example is stale; `go test -update` rewrites them.
// Also checks that every text key the partials use exists in every i18n file.

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"html/template"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"testing"
)

var update = flag.Bool("update", false, "rewrite examples/*.html")

type Brand struct{ App, Char, Name, Color, ColorDark, Logo, LogoDark, Icon, Design string }
type Link struct {
	Href, Label, Key string
	On               bool
}
type Page struct {
	Lang, Title, Here, Q, Version, Err, Notice string
	Brand                                      Brand
	Nav                                        []Link
	Search, SearchAPI                          string
	User, UserURL, LogoutURL                   string
	Texts                                      map[string]string
	texts                                      map[string]string
}

func (p Page) T(key string, args ...any) string {
	if s, ok := p.texts[key]; ok {
		return fmt.Sprintf(s, args...)
	}
	return key
}

func loadTexts(t *testing.T, lang string) map[string]string {
	b, err := os.ReadFile("i18n/" + lang + ".json")
	if err != nil {
		t.Fatal(err)
	}
	m := map[string]string{}
	if err := json.Unmarshal(b, &m); err != nil {
		t.Fatalf("i18n/%s.json: %v", lang, err)
	}
	return m
}

func TestTextKeys(t *testing.T) {
	src, _ := os.ReadFile("partials.html")
	js, _ := os.ReadFile("ui.js")
	used := map[string]bool{}
	for _, m := range regexp.MustCompile(`\.T "([^"]+)"`).FindAllStringSubmatch(string(src), -1) {
		used[m[1]] = true
	}
	for _, m := range regexp.MustCompile(`T\['([a-z.]+)'\]`).FindAllStringSubmatch(string(js), -1) {
		used[m[1]] = true
	}
	for _, lang := range []string{"en", "de"} {
		texts := loadTexts(t, lang)
		for k := range used {
			if _, ok := texts[k]; !ok {
				t.Errorf("i18n/%s.json: missing %q", lang, k)
			}
		}
	}
}

func TestExamples(t *testing.T) {
	texts := loadTexts(t, "en")
	js := map[string]string{}
	for k, v := range texts {
		if strings.HasPrefix(k, "js.") || strings.HasPrefix(k, "search.") {
			js[k] = v
		}
	}
	js["search.customers"], js["search.invoices"] = "Customers", "Invoices"
	pages, _ := filepath.Glob("pages/*.html")
	if len(pages) == 0 {
		t.Fatal("no pages")
	}
	for _, p := range pages {
		name := filepath.Base(p)
		tpl := template.Must(template.Must(template.ParseFiles("partials.html")).ParseFiles(p))
		nav := []Link{{"index.html", "Gallery", "a", false}, {"list.html", "Customers", "c", false}, {"detail.html", "Detail", "d", false},
			{"form.html", "Form", "f", false}, {"settings.html", "Settings", "s", false}}
		for i := range nav {
			nav[i].On = nav[i].Href == name
		}
		page := Page{Lang: "en", Here: "/" + name, Version: "v1 (3f2a9c1)", Texts: js, texts: texts, Nav: nav,
			Brand:  Brand{App: "demo", Char: "◆"},
			Search: "list.html", SearchAPI: "/api/search", User: "peter", UserURL: "settings.html", LogoutURL: "login.html"}
		if src, _ := os.ReadFile(p); bytes.Contains(src, []byte("nb-bare")) { // public pages: no nav, search or user
			page.Nav, page.Search, page.User, page.LogoutURL = nil, "", "", ""
		}
		page.Title = map[string]string{"index.html": "Gallery", "list.html": "Customers", "detail.html": "ACME GmbH", "form.html": "New customer",
			"settings.html": "Settings", "status.html": "Status", "login.html": "Log in"}[name]
		var b bytes.Buffer
		if err := tpl.ExecuteTemplate(&b, name, page); err != nil {
			t.Fatalf("%s: %v", name, err)
		}
		// apps serve /static/ and /; the examples are plain files next to ../ui.css
		out := strings.NewReplacer(`"/static/`, `"../`, `href="/"`, `href="index.html"`).Replace(b.String())
		dst := filepath.Join("examples", name)
		old, _ := os.ReadFile(dst)
		if string(old) == out {
			continue
		}
		if !*update {
			t.Errorf("%s is stale: run go test -update", dst)
			continue
		}
		if err := os.WriteFile(dst, []byte(out), 0o644); err != nil {
			t.Fatal(err)
		}
	}
}

func TestBrand(t *testing.T) {
	tpl := template.Must(template.ParseFiles("partials.html"))
	p := Page{Brand: Brand{App: "bill", Char: "€", Name: "ACME", Color: "#7c3aed", ColorDark: "#a78bfa", Logo: "/brand/logo", LogoDark: "/brand/logo-dark", Design: "ink"}}
	var b bytes.Buffer
	for _, n := range []string{"nb-head", "nb-logo"} {
		if err := tpl.ExecuteTemplate(&b, n, p); err != nil {
			t.Fatal(err)
		}
	}
	for _, want := range []string{`data-design="ink"`, `--brand: #7c3aed; --brand-dark: #a78bfa;`, `<title>ACME</title>`,
		`<img class="light" src="/brand/logo" alt="">`, `<img class="dark" src="/brand/logo-dark" alt="">`, `aria-label="ACME"`} {
		if !strings.Contains(b.String(), want) {
			t.Errorf("missing %s in\n%s", want, b.String())
		}
	}
}
