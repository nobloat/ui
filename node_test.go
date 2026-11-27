package ui

import (
	"io"
	"reflect"
	"regexp"
	"slices"
	"strings"
	"testing"
)

// TestRules: what the rules forbid cannot be rendered.
func TestRules(t *testing.T) {
	form := func(fs []Node, bs ...Button) Node { return Page{Title: "t", Main: Form{Fields: fs, Actions: bs}} }
	for want, n := range map[string]Node{
		"needs an icon":        form(nil, Button{Label: "Go"}),
		"second primary":       form(nil, Button{Label: "A", Icon: IconCheck, Primary: true}, Button{Label: "B", Icon: IconX, Primary: true}),
		"needs a name and":     form([]Node{Field{Name: "a"}}),
		"pattern needs":        form([]Node{Field{Name: "a", Label: "A", Pattern: "[0-9]+"}}),
		"used twice":           form([]Node{Field{Name: "a", Label: "A", Hint: "h"}, Field{Name: "a", Label: "A", Hint: "h"}}),
		"title and a language": Page{Main: Form{}},
	} {
		err := n.Render(NewCtx("en", nil), io.Discard)
		if err == nil || !strings.Contains(err.Error(), want) {
			t.Errorf("want an error with %q, got %v", want, err)
		}
	}
}

// TestText: labels are keys, resolved at render; markup is escaped.
func TestText(t *testing.T) {
	var b strings.Builder
	tr := map[string]string{"save": "Speichern"}
	err := Render(&b, "de", func(k string) string { return tr[k] }, Page{Title: "save", Main: Form{Actions: []Button{{Label: "save", Icon: IconCheck, Href: "javascript:alert(1)"}}}})
	if err != nil {
		t.Fatal(err)
	}
	for _, s := range []string{`<html lang="de">`, "<span>Speichern</span>", `href="#ZgotmplZ"`} {
		if !strings.Contains(b.String(), s) {
			t.Errorf("missing %s in %s", s, b.String())
		}
	}
}

// TestElements: a custom element's observedAttributes (in <level>/<part>/<part>.js for nb-<part>) are exactly the attr
// tags of its Go type, so the HTML, the script and the editors' data agree.
func TestElements(t *testing.T) {
	re := regexp.MustCompile(`static observedAttributes = \[([^\]]*)\]`)
	for el, v := range Elements {
		part := strings.TrimPrefix(el, "nb-")
		var src []byte
		for _, l := range levels {
			if b, err := files.ReadFile(l + "/" + part + "/" + part + ".js"); err == nil {
				src = b
			}
		}
		m := re.FindSubmatch(src)
		if m == nil {
			t.Errorf("%s: no static observedAttributes in its script", el)
			continue
		}
		var js, tags []string
		for _, a := range strings.Split(string(m[1]), ",") {
			js = append(js, strings.Trim(strings.TrimSpace(a), `'"`))
		}
		typ := reflect.TypeOf(v)
		for i := range typ.NumField() {
			if a := typ.Field(i).Tag.Get("attr"); a != "" {
				tags = append(tags, a)
			}
		}
		slices.Sort(js)
		slices.Sort(tags)
		if !slices.Equal(js, tags) {
			t.Errorf("%s: observedAttributes %v, %s attr tags %v", el, js, typ.Name(), tags)
		}
	}
}
