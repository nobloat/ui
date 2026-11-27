package ui

// Typed UI: a page is a Go value. Every part renders through its own template (<level>/<part>/<part>.html), which only
// prints what the part's Render prepared; rendering records the parts and icons used, so Assets can build exactly the CSS
// and JS a set of pages needs. Copied into an app unchanged by `go run ../ui/cmd/nbui copy`.

import (
	"bytes"
	"embed"
	"fmt"
	"html/template"
	"io"
	"io/fs"
	"strings"
)

//go:embed token components shell icons.css
var files embed.FS

// Node is anything that renders into a slot: ui's parts and an app's own.
type Node interface {
	Render(c *Ctx, w io.Writer) error
}

// Text is an i18n key, resolved in the request's language when the page renders.
type Text string

// Ctx is one render of one page.
type Ctx struct {
	Lang  string
	T     func(key string) string // nil: the key is the text
	used  map[string]bool         // parts, as "components/button"
	icons map[string]bool
	ids   map[string]bool
	pri   int // primary actions on the page
}

func NewCtx(lang string, t func(string) string) *Ctx {
	return &Ctx{Lang: lang, T: t, used: map[string]bool{}, icons: map[string]bool{}, ids: map[string]bool{}}
}

func (c *Ctx) text(k Text) string {
	if c.T == nil || k == "" {
		return string(k)
	}
	return c.T(string(k))
}

func (c *Ctx) use(parts ...string) {
	for _, p := range parts {
		c.used[p] = true
	}
}

func (c *Ctx) icon(i Icon) string {
	c.icons[string(i)] = true
	return string(i)
}

// id reserves an element id; a second use on the same page is an error, not a broken label.
func (c *Ctx) id(s string) (string, error) {
	if c.ids[s] {
		return "", fmt.Errorf("id %q used twice on one page", s)
	}
	c.ids[s] = true
	return s, nil
}

// node renders a slot into HTML for a part's template.
func (c *Ctx) node(n Node) (template.HTML, error) {
	if n == nil {
		return "", nil
	}
	var b bytes.Buffer
	err := n.Render(c, &b)
	return template.HTML(b.String()), err
}

func (c *Ctx) nodes(ns []Node) (template.HTML, error) {
	var s template.HTML
	for _, n := range ns {
		h, err := c.node(n)
		if err != nil {
			return "", err
		}
		s += h
	}
	return s, nil
}

var tmpl = map[string]*template.Template{}

func init() {
	fs.WalkDir(files, ".", func(path string, d fs.DirEntry, err error) error {
		if err != nil || d.IsDir() || !strings.HasSuffix(path, ".html") {
			return err
		}
		part := path[:strings.LastIndex(path, "/")]
		b, _ := files.ReadFile(path)
		tmpl[part] = template.Must(template.New(part).Parse(strings.TrimSpace(string(b))))
		return nil
	})
}

// exec records the part and runs its template.
func (c *Ctx) exec(w io.Writer, part string, v any) error {
	c.use(part)
	return tmpl[part].Execute(w, v)
}

// Render renders a page completely before writing it, so a failed render never sends half a page.
func Render(w io.Writer, lang string, t func(string) string, n Node) error {
	var b bytes.Buffer
	if err := n.Render(NewCtx(lang, t), &b); err != nil {
		return err
	}
	_, err := w.Write(b.Bytes())
	return err
}
