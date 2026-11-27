package ui

import (
	"html/template"
	"io"
)

// Form: a plain POST (or GET) that works without JavaScript; the handler checks it and renders the page again with Err
// on the fields. Its actions are submit buttons unless they are links (Cancel).
type Form struct {
	Action  string
	Get     bool
	Fields  []Node
	Actions []Button
}

func (f Form) Render(c *Ctx, w io.Writer) error {
	fields, err := c.nodes(f.Fields)
	if err != nil {
		return err
	}
	var actions template.HTML
	for _, b := range f.Actions {
		b.Submit = b.Href == ""
		h, err := c.node(b)
		if err != nil {
			return err
		}
		actions += h
	}
	method := "post"
	if f.Get {
		method = "get"
	}
	return c.exec(w, "components/form", struct {
		Action, Method  string
		Fields, Actions template.HTML
	}{f.Action, method, fields, actions})
}
