package ui

// Renders pages/*.html through partials.html into examples/*.html, so the examples are the partials in use.
// `go test` fails when an example is stale; `go test -update` rewrites them.
// Also checks that every text key the partials use exists in every i18n file.

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"go/format"
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

type exBrand struct{ App, Char, Name, Color, ColorDark, Logo, LogoDark, Icon, Design string }
type exLink struct {
	Href, Label, Key string
	On               bool
}

// Action and ErrorInfo: what an app passes as .Error to nb-error (partials.html documents the fields)
type exAction struct {
	Href, Label, Icon, Key string
	Palette                bool
}
type exErrorInfo struct {
	Code                   int
	What, Need, Limit, Ref string
	Groups                 []string
	Retry                  int
	Actions                []exAction
}
type exPage struct {
	Error                                      *exErrorInfo
	Lang, Title, Here, Q, Version, Err, Notice string
	Brand                                      exBrand
	Nav                                        []exLink
	Search, SearchAPI                          string
	User, UserURL, LogoutURL, SettingsURL      string
	Crumbs                                     []exLink
	SessionEnd, SessionRenew                   string
	Texts                                      map[string]string
	texts                                      map[string]string
}

func (p exPage) T(key string, args ...any) string {
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
		nav := []exLink{{"index.html", "Gallery", "a", false}, {"dashboard.html", "Dashboard", "b", false}, {"list.html", "Customers", "c", false}, {"detail.html", "Detail", "d", false},
			{"form.html", "Form", "f", false}, {"dates.html", "Formats", "t", false}, {"week.html", "Week", "w", false}, {"month.html", "Month", "m", false}, {"icons.html", "Icons", "i", false}}
		for i := range nav {
			nav[i].On = nav[i].Href == name
		}
		page := exPage{Lang: "en", Here: "/" + name, Version: "v1 (3f2a9c1)", Texts: js, texts: texts, Nav: nav,
			Brand:  exBrand{App: "demo", Char: "◆"},
			Search: "list.html", SearchAPI: "/api/search", User: "peter", UserURL: "settings.html", LogoutURL: "login.html", SettingsURL: "settings.html"}
		if src, _ := os.ReadFile(p); bytes.Contains(src, []byte("nb-bare")) { // public pages: no nav, search or user
			page.Nav, page.Search, page.User, page.LogoutURL, page.SettingsURL = nil, "", "", "", ""
		}
		page.Crumbs = map[string][]exLink{
			"detail.html": {{Href: "list.html", Label: "Customers"}, {Label: "ACME GmbH"}},
			"form.html":   {{Href: "list.html", Label: "Customers"}, {Href: "detail.html", Label: "ACME GmbH"}, {Label: "Edit"}},
			"week.html":   {{Href: "month.html", Label: "November 2026"}, {Label: "Week 45"}},
		}[name]
		page.Title = map[string]string{"index.html": "Gallery", "icons.html": "Icons", "dashboard.html": "Dashboard", "400.html": "Bad request", "401.html": "Signed out", "403.html": "No access", "404.html": "Not found", "409.html": "Changed elsewhere", "410.html": "Link expired", "413.html": "Too large", "429.html": "Slow down", "500.html": "Error", "503.html": "Unavailable", "list.html": "Customers", "detail.html": "ACME GmbH", "form.html": "New customer",
			"settings.html": "Settings", "status.html": "Status", "login.html": "Log in", "dates.html": "Formats", "week.html": "Week 45", "month.html": "November 2026"}[name]
		home, account := exAction{"dashboard.html", "Dashboard", "dashboard", "", false}, exAction{"settings.html", "Your account", "user", "", false}
		signin := exAction{"login.html", "Sign in", "log-in", "", false}
		page.Error = map[string]*exErrorInfo{
			"400.html": {Code: 400, Actions: []exAction{{"list.html", "Back to customers", "arrow-left", "", false}, home}},
			"401.html": {Code: 401, Actions: []exAction{signin}},
			"403.html": {Code: 403, Need: "the admin role", Groups: []string{"acme-editor"}, Actions: []exAction{home, account, {"login.html", "Sign in as someone else", "log-in", "", false}}},
			"404.html": {Code: 404, What: "customer CUS-9999", Actions: []exAction{{"list.html", "All customers", "users", "", false}, {Label: "Search", Icon: "search", Palette: true}}},
			"409.html": {Code: 409, Actions: []exAction{{"", "Reload", "refresh", "", false}, {"detail.html", "ACME GmbH", "arrow-left", "", false}}},
			"410.html": {Code: 410, Actions: []exAction{{"index.html", "Newsletter home", "mail", "", false}}},
			"413.html": {Code: 413, Limit: "25 MB", Actions: []exAction{{"form.html", "Back to the upload", "upload", "", false}}},
			"429.html": {Code: 429, Retry: 30, Actions: []exAction{{"", "Try again now", "refresh", "", false}}},
			"500.html": {Code: 500, Ref: "ERR-7F3A9C12", Actions: []exAction{{"", "Try again", "refresh", "", false}, home}},
			"503.html": {Code: 503, Retry: 15, Actions: []exAction{{"", "Try again now", "refresh", "", false}}},
		}[name]
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

// TestErrorDots writes nb-error-dots into partials.html: each error code nb-error knows, as a 5×7 dot-matrix display.
// The font is here and only here; stale output fails, -update rewrites.
func TestErrorDots(t *testing.T) {
	font := map[rune][7]string{
		'0': {"01110", "10001", "10011", "10101", "11001", "10001", "01110"},
		'1': {"00100", "01100", "00100", "00100", "00100", "00100", "01110"},
		'2': {"01110", "10001", "00001", "00010", "00100", "01000", "11111"},
		'3': {"11111", "00010", "00100", "00010", "00001", "10001", "01110"},
		'4': {"00010", "00110", "01010", "10010", "11111", "00010", "00010"},
		'5': {"11111", "10000", "11110", "00001", "00001", "10001", "01110"},
		'9': {"01110", "10001", "10001", "01111", "00001", "00010", "01100"},
	}
	const pitch = 6.0
	var b strings.Builder
	b.WriteString(`{{define "nb-error-dots"}}`)
	for i, code := range []string{"400", "401", "403", "404", "409", "410", "413", "429", "500", "503"} {
		var cols [][7]byte
		blank := [7]byte{'0', '0', '0', '0', '0', '0', '0'}
		cols = append(cols, blank) // margin
		for j, ch := range code {
			if j > 0 {
				cols = append(cols, blank, blank) // between digits
			}
			for c := 0; c < 5; c++ {
				var col [7]byte
				for r := 0; r < 7; r++ {
					col[r] = font[ch][r][c]
				}
				cols = append(cols, col)
			}
		}
		cols = append(cols, blank)
		if i == 0 {
			fmt.Fprintf(&b, `{{if eq . %s}}`, code)
		} else {
			fmt.Fprintf(&b, `{{else if eq . %s}}`, code)
		}
		fmt.Fprintf(&b, `<svg class="dots" viewBox="0 0 %g %g" aria-hidden="true">`, float64(len(cols))*pitch, 9*pitch)
		for x, col := range cols {
			for y, v := range col {
				cx, cy := float64(x)*pitch+pitch/2, float64(y+1)*pitch+pitch/2
				if v == '1' {
					fmt.Fprintf(&b, `<circle class="on" cx="%g" cy="%g" r="2.45" style="--i:%d"/>`, cx, cy, x)
				} else {
					fmt.Fprintf(&b, `<circle class="off" cx="%g" cy="%g" r="1.5"/>`, cx, cy)
				}
			}
		}
		b.WriteString(`</svg>`)
	}
	b.WriteString("{{end}}{{end}}\n")
	src, _ := os.ReadFile("partials.html")
	re := regexp.MustCompile(`(?s)(\{\{/\* dots:begin[^\n]*\*/\}\}\n).*?(\{\{/\* dots:end \*/\}\})`)
	want := re.ReplaceAllString(string(src), "${1}"+strings.ReplaceAll(b.String(), "$", "$$")+"${2}")
	if want == string(src) {
		return
	}
	if !*update {
		t.Error("partials.html: nb-error-dots is stale: run go test -update")
		return
	}
	if err := os.WriteFile("partials.html", []byte(want), 0o644); err != nil {
		t.Fatal(err)
	}
}

// TestIcons builds icons.svg (sprite), the icons block in ui.css and icons.css (the icon rule and block alone, for pages
// without ui.css: gazette's public pages) from icons/*.svg; stale output fails, -update rewrites.
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
	rule := regexp.MustCompile(`(?m)^:is\(\[class\^="icon-"\].*\n`).FindString(string(css))
	if rule == "" {
		t.Fatal("ui.css: the :is([class^=\"icon-\"] …) rule is missing")
	}
	only := "/* nobloat/ui icons, generated from icons/*.svg by go test -update: for pages that do not load ui.css */\n" + rule + block
	consts := "// Code generated from icons/*.svg by go test -update; DO NOT EDIT.\n\npackage ui\n\n// Icon is one of the icons in icons/; a name that does not exist does not compile.\ntype Icon string\n\nconst (\n"
	for _, f := range files {
		name := strings.TrimSuffix(filepath.Base(f), ".svg")
		ident := "Icon"
		for _, w := range strings.Split(name, "-") {
			ident += strings.ToUpper(w[:1]) + w[1:]
		}
		consts += fmt.Sprintf("\t%s Icon = %q\n", ident, name)
	}
	consts += ")\n\n// IconNames: every icon, for checks and editors.\nvar IconNames = []string{"
	for _, f := range files {
		consts += fmt.Sprintf("%q, ", strings.TrimSuffix(filepath.Base(f), ".svg"))
	}
	src, err := format.Source([]byte(consts + "}\n"))
	if err != nil {
		t.Fatal(err)
	}
	for path, want := range map[string]string{"ui.css": newCSS, "icons.svg": sprite.String(), "icons.css": only, "icons_gen.go": string(src)} {
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

// TestIconMap: every icon the rules name in the icon map (skill/design-system.md) exists in icons/ (`off` is a modifier).
func TestIconMap(t *testing.T) {
	b, _ := os.ReadFile("skill/design-system.md")
	line := regexp.MustCompile(`(?m)^- The same action has the same icon everywhere\..*$`).FindString(string(b))
	if line == "" {
		t.Fatal("skill/design-system.md: the icon map line is missing")
	}
	for _, m := range regexp.MustCompile("`([a-z-]+)`").FindAllStringSubmatch(line, -1) {
		if _, err := os.Stat("icons/" + m[1] + ".svg"); err != nil && m[1] != "off" {
			t.Errorf("icon map names %s, which is not in icons/", m[1])
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
	p := exPage{Brand: exBrand{App: "bill", Char: "€", Name: "ACME", Color: "#7c3aed", ColorDark: "#a78bfa", Logo: "/brand/logo", LogoDark: "/brand/logo-dark", Design: "paper"}}
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

// TestTokensOnly: components.css, blocks.css, shell.css and documents.css take every length, duration and opacity from the foundations tokens. Allowed:
// 1em (the text size), the 1px of a visually hidden element, percentages of an element's own box (centring, corners),
// and the container width in @container (custom properties cannot be used there).
func TestTokensOnly(t *testing.T) {
	for _, file := range layerFiles() {
		tokensOnly(t, file)
	}
}

func tokensOnly(t *testing.T, file string) {
	b, err := os.ReadFile(file)
	if err != nil {
		t.Fatal(err)
	}
	css := regexp.MustCompile(`(?s)/\*.*?\*/`).ReplaceAllString(string(b), "")
	css = regexp.MustCompile(`@(container|media) [^{]*\([^)]*\)`).ReplaceAllString(css, "")
	css = strings.ReplaceAll(css, "width: 1px; height: 1px", "")
	raw := regexp.MustCompile(`(?:^|[^\w.-])(-?\d*\.?\d+(?:px|rem|em|ms|s))\b|opacity:\s*(\.\d+|0\.\d+)`)
	// colours: hex, colour functions and named colours; transparent and currentColor are not values
	colour := regexp.MustCompile(`(#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(|(?:^|[^\w-])(?:white|black|gr[ae]y|red|green|blue|yellow|orange|purple|pink)(?:[^\w-]|$))`)
	for i, line := range strings.Split(css, "\n") {
		for _, m := range raw.FindAllStringSubmatch(line, -1) {
			if v := m[1] + m[2]; v != "1em" {
				t.Errorf("%s:%d: %s is not a token", file, i+1, v)
			}
		}
		for _, m := range colour.FindAllString(line, -1) {
			t.Errorf("%s:%d: colour %q is not a token", file, i+1, strings.Trim(m, " ,;:()"))
		}
	}
}

// TestTokensDefined: every var(--x) without a fallback in the layer files is defined: in token/token.css, in a layer file
// (a component's own formula, e.g. --hover) or set inline on a specimen (style="--value:26%").
func TestTokensDefined(t *testing.T) {
	var all strings.Builder
	for _, g := range []string{"*.css", "*.html", "token/*.css", "components/*/*.css", "blocks/*/*.css", "shell/*/*.css"} {
		files, _ := filepath.Glob(g)
		for _, f := range files {
			b, _ := os.ReadFile(f)
			all.Write(b)
		}
	}
	defined := map[string]bool{}
	for _, m := range regexp.MustCompile(`(--[\w-]+)\s*:`).FindAllStringSubmatch(all.String(), -1) {
		defined[m[1]] = true
	}
	for _, file := range layerFiles() {
		b, _ := os.ReadFile(file)
		for i, line := range strings.Split(string(b), "\n") {
			for _, m := range regexp.MustCompile(`var\((--[\w-]+)\)`).FindAllStringSubmatch(line, -1) {
				if !defined[m[1]] {
					t.Errorf("%s:%d: %s is not defined", file, i+1, m[1])
				}
			}
		}
	}
}

// layerFiles: the CSS of every layer, the old files and the parts' own (<level>/<part>/<part>.css).
func layerFiles() []string {
	files := []string{"components.css", "blocks.css", "shell.css", "documents.css", "proposals.css", "token/base.css"}
	for _, level := range levels {
		parts, _ := filepath.Glob(level + "/*/*.css")
		files = append(files, parts...)
	}
	return files
}
