package ui

import (
	"fmt"
	"io"
)

// Button: an action with an icon and a word (Rules: Icons and buttons). With Href it is a link that looks like a button.
type Button struct {
	Label    Text
	Icon     Icon   // required: every button has one
	Key      string // its shortcut (data-key), shown as a hint on desktop
	Primary  bool   // the one main action of the page
	Danger   bool
	IconOnly bool // the label becomes its name (aria-label) and tooltip (title)
	Href     string
	Submit   bool // type=submit; Form sets it on its actions
	Name     string
	Value    string
}

func (b Button) Render(c *Ctx, w io.Writer) error {
	if b.Icon == "" || b.Label == "" {
		return fmt.Errorf("button %q: needs an icon and a label", b.Label)
	}
	if b.Primary {
		if c.pri++; c.pri > 1 {
			return fmt.Errorf("button %q: a second primary action on the page", b.Label)
		}
	}
	class := "button"
	switch {
	case b.Primary:
		class += " primary"
	case b.Danger:
		class += " danger"
	}
	if b.IconOnly {
		class += " icon-only"
	}
	typ := "button"
	if b.Submit {
		typ = "submit"
	}
	label, title := c.text(b.Label), ""
	if b.IconOnly {
		title = label
		if b.Key != "" {
			title += " (" + b.Key + ")"
		}
	} else if b.Key != "" {
		c.use("components/kbd")
	}
	return c.exec(w, "components/button", struct {
		Class, Type, Label, Title, Key, Name, Value, Href string
		Icon                                              string
		IconOnly                                          bool
	}{class, typ, label, title, b.Key, b.Name, b.Value, b.Href, c.icon(b.Icon), b.IconOnly})
}
