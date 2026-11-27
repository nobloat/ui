package ui

import (
	"bytes"
	"fmt"
	"html/template"
	"io"
)

// Page: a whole HTML page. Today the bare page (no header, nav or footer: sign in, errors); the frame's blocks come next.
type Page struct {
	Title  Text   // the <title> and the one h1
	App    string // after the title in <title>
	Static string // where ui.css and ui.js are served; default /static/
	Main   Node
}

func (p Page) Render(c *Ctx, w io.Writer) error {
	if p.Title == "" || c.Lang == "" {
		return fmt.Errorf("page: needs a title and a language")
	}
	var main bytes.Buffer
	if err := p.Main.Render(c, &main); err != nil {
		return err
	}
	static := p.Static
	if static == "" {
		static = "/static/"
	}
	return c.exec(w, "shell/page", struct {
		Lang, Title, App, Static string
		JS                       bool
		Main                     template.HTML
	}{c.Lang, c.text(p.Title), p.App, static, c.hasJS(), template.HTML(main.String())})
}
