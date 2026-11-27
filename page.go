package ui

import (
	"bytes"
	"fmt"
	"html/template"
	"io"
)

// Page: a whole HTML page (layer 3, the shell). With a Header it is an app page (skip link, header with nav and user
// menu, the page head, main at a readable width, the footer); without one the bare page (sign in, errors).
type Page struct {
	Title   Text   // the <title>, and the h1 when there is no Head
	App     string // after the title in <title>
	Static  string // where ui.css and ui.js are served; default /static/
	Header  *Header
	Head    *PageHead
	Main    Node
	Footer  *Footer
	Palette *Palette
}

func (p Page) Render(c *Ctx, w io.Writer) error {
	if p.Title == "" || c.Lang == "" {
		return fmt.Errorf("page: needs a title and a language")
	}
	if p.Header != nil && p.Header.Commands != (p.Palette != nil) {
		return fmt.Errorf("page %q: the Commands button and the palette come together", p.Title)
	}
	var header, head, main, footer, palette bytes.Buffer
	for _, part := range []struct {
		n   Node
		b   *bytes.Buffer
		set bool
	}{{p.Header, &header, p.Header != nil}, {p.Head, &head, p.Head != nil}, {p.Main, &main, p.Main != nil},
		{p.Footer, &footer, p.Footer != nil}, {p.Palette, &palette, p.Palette != nil}} {
		if part.set {
			if err := part.n.Render(c, part.b); err != nil {
				return err
			}
		}
	}
	if p.Head != nil {
		c.use("blocks/page-head")
	}
	static := p.Static
	if static == "" {
		static = "/static/"
	}
	return c.exec(w, "shell/page", struct {
		Lang, Title, App, Static            string
		JS                                  bool
		Header, Head, Main, Footer, Palette template.HTML
	}{c.Lang, c.text(p.Title), p.App, static, c.hasJS(), template.HTML(header.String()), template.HTML(head.String()),
		template.HTML(main.String()), template.HTML(footer.String()), template.HTML(palette.String())})
}

// Dashboard: the app's start page: stat tiles first, then cards with what needs doing.
type Dashboard struct {
	Tiles []StatTile
	Cards []Card
}

func (d Dashboard) Render(c *Ctx, w io.Writer) error {
	var tiles, cards bytes.Buffer
	for _, t := range d.Tiles {
		if err := t.Render(c, &tiles); err != nil {
			return err
		}
	}
	for _, k := range d.Cards {
		if err := k.Render(c, &cards); err != nil {
			return err
		}
	}
	return c.exec(w, "shell/dashboard", struct{ Tiles, Cards template.HTML }{template.HTML(tiles.String()), template.HTML(cards.String())})
}
