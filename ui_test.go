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
	"math"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
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
	User, UserURL, LogoutURL, SettingsURL      string
	Crumbs                                     []Link
	SessionEnd, SessionRenew                   string
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
		funcs := template.FuncMap{"icons": iconNames, "sizes": func() []int { return []int{12, 16, 20, 24, 32, 48} }, "spark": Spark, "columns": func(title, labels, vals string) template.HTML { // the examples pass lists as strings
			var v []float64
			for _, f := range strings.Fields(vals) {
				x, _ := strconv.ParseFloat(f, 64)
				v = append(v, x)
			}
			return Columns(title, strings.Fields(labels), v, eur)
		}}
		tpl := template.Must(template.Must(template.New("").Funcs(funcs).ParseFiles("partials.html")).ParseFiles(p))
		nav := []Link{{"index.html", "Gallery", "a", false}, {"dashboard.html", "Dashboard", "b", false}, {"list.html", "Customers", "c", false}, {"detail.html", "Detail", "d", false},
			{"form.html", "Form", "f", false}, {"dates.html", "Formats", "t", false}, {"week.html", "Week", "w", false}, {"month.html", "Month", "m", false}, {"icons.html", "Icons", "i", false}}
		for i := range nav {
			nav[i].On = nav[i].Href == name
		}
		page := Page{Lang: "en", Here: "/" + name, Version: "v1 (3f2a9c1)", Texts: js, texts: texts, Nav: nav,
			Brand:  Brand{App: "demo", Char: "◆"},
			Search: "list.html", SearchAPI: "/api/search", User: "peter", UserURL: "settings.html", LogoutURL: "login.html", SettingsURL: "settings.html"}
		if src, _ := os.ReadFile(p); bytes.Contains(src, []byte("nb-bare")) { // public pages: no nav, search or user
			page.Nav, page.Search, page.User, page.LogoutURL, page.SettingsURL = nil, "", "", "", ""
		}
		page.Crumbs = map[string][]Link{
			"detail.html": {{Href: "list.html", Label: "Customers"}, {Label: "ACME GmbH"}},
			"form.html":   {{Href: "list.html", Label: "Customers"}, {Href: "detail.html", Label: "ACME GmbH"}, {Label: "Edit"}},
			"week.html":   {{Href: "month.html", Label: "November 2026"}, {Label: "Week 45"}},
		}[name]
		page.Title = map[string]string{"index.html": "Gallery", "icons.html": "Icons", "dashboard.html": "Dashboard", "404.html": "Not found", "403.html": "No access", "500.html": "Error", "list.html": "Customers", "detail.html": "ACME GmbH", "form.html": "New customer",
			"settings.html": "Settings", "status.html": "Status", "login.html": "Log in", "dates.html": "Formats", "week.html": "Week 45", "month.html": "November 2026"}[name]
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

// eur formats like the examples' configured money format "1.234,56 €"
func eur(x float64) string {
	c := int64(math.Round(x * 100))
	s := strconv.FormatInt(c/100, 10)
	for i := len(s) - 3; i > 0; i -= 3 {
		s = s[:i] + "." + s[i:]
	}
	return fmt.Sprintf("%s,%02d €", s, c%100)
}

// iconStyle is the one style of the set ("precise"): thin, square ends, sharp joins, in the text color.
const iconStyle = `fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="square" stroke-linejoin="miter"`

// TestIcons builds icons.svg (sprite) and the icons block in ui.css from icons/*.svg; stale output fails, -update rewrites.
func TestIcons(t *testing.T) {
	files, _ := filepath.Glob("icons/*.svg")
	if len(files) == 0 {
		t.Fatal("no icons")
	}
	tag := regexp.MustCompile(`^<svg ([^>]*)>(.*)</svg>\s*$`)
	var sprite, vars, classes strings.Builder
	sprite.WriteString(`<svg xmlns="http://www.w3.org/2000/svg">` + "\n")
	for _, f := range files {
		b, _ := os.ReadFile(f)
		m := tag.FindStringSubmatch(string(b))
		name := strings.TrimSuffix(filepath.Base(f), ".svg")
		if m == nil || !strings.Contains(m[1], `viewBox="0 0 16 16" `+iconStyle) || strings.Contains(m[2], "stroke-width") {
			t.Fatalf("%s: <svg xmlns=… viewBox=\"0 0 16 16\" %s> exactly, no other stroke widths inside (README: Adding an icon)", f, iconStyle)
		}
		attrs := strings.Replace(m[1], `xmlns="http://www.w3.org/2000/svg" `, "", 1)
		fmt.Fprintf(&sprite, "<symbol id=\"%s\" viewBox=\"0 0 16 16\"><g %s>%s</g></symbol>\n", name, strings.Replace(attrs, `viewBox="0 0 16 16" `, "", 1), m[2])
		uri := strings.NewReplacer(`"`, "'", "#", "%23", "<", "%3C", ">", "%3E").Replace(strings.TrimSpace(string(b)))
		fmt.Fprintf(&vars, "  --icon-%s: url(\"data:image/svg+xml,%s\");\n", name, uri)
		fmt.Fprintf(&classes, ".icon-%s { --icon: var(--icon-%s); }\n", name, name)
	}
	sprite.WriteString("</svg>\n")
	css, _ := os.ReadFile("ui.css")
	re := regexp.MustCompile(`(?s)(/\* icons:begin[^\n]*\*/\n).*?(/\* icons:end \*/)`)
	block := ":where(:root) {\n" + vars.String() + "}\n" + classes.String()
	newCSS := re.ReplaceAllString(string(css), "${1}"+strings.ReplaceAll(block, "$", "$$")+"${2}")
	for path, want := range map[string]string{"ui.css": newCSS, "icons.svg": sprite.String()} {
		old, _ := os.ReadFile(path)
		if string(old) == want {
			continue
		}
		if !*update {
			t.Errorf("%s is stale: run go test -update", path)
			continue
		}
		if err := os.WriteFile(path, []byte(want), 0o644); err != nil {
			t.Fatal(err)
		}
	}
}

func iconNames() []string {
	files, _ := filepath.Glob("icons/*.svg")
	var n []string
	for _, f := range files {
		n = append(n, strings.TrimSuffix(filepath.Base(f), ".svg"))
	}
	return n
}

func TestBrand(t *testing.T) {
	tpl := template.Must(template.ParseFiles("partials.html"))
	p := Page{Brand: Brand{App: "bill", Char: "€", Name: "ACME", Color: "#7c3aed", ColorDark: "#a78bfa", Logo: "/brand/logo", LogoDark: "/brand/logo-dark", Design: "paper"}}
	var b bytes.Buffer
	for _, n := range []string{"nb-head", "nb-logo"} {
		if err := tpl.ExecuteTemplate(&b, n, p); err != nil {
			t.Fatal(err)
		}
	}
	for _, want := range []string{`data-design="paper"`, `--brand: #7c3aed; --brand-dark: #a78bfa;`, `<title>ACME</title>`,
		`<img class="light" src="/brand/logo" alt="">`, `<img class="dark" src="/brand/logo-dark" alt="">`, `aria-label="ACME"`} {
		if !strings.Contains(b.String(), want) {
			t.Errorf("missing %s in\n%s", want, b.String())
		}
	}
}
