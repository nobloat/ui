package ui

import (
	"fmt"
	"io"
)

// Button: an action with an icon and a word (Rules: Icons and buttons). With Href it is a link that looks like a button.
type Button struct {
	Label     Text
	Icon      Icon   // required: every button has one
	Off       bool   // the icon crossed out (mic off)
	Key       string // its shortcut (data-key), shown as a hint on desktop
	Primary   bool   // the one main action of the page
	Danger    bool
	IconOnly  bool   // the label becomes its name (aria-label) and tooltip (title)
	PhoneIcon bool   // only the icon on phones (create, edit, delete, copy)
	Toggle    bool   // a switch that stays: aria-pressed with On
	On        bool   // a pressed toggle
	Badge     string // a count on it
	Href      string
	Submit    bool // type=submit; Form sets it on its actions
	Name      string
	Value     string
	Popover   string // the id of the menu it opens (popovertarget)
	Dialog    string // the id of the dialog it opens (command=show-modal)
	Form      string // the id of the form it submits when it sits outside it (sign out in a menu)
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
	} else if b.PhoneIcon {
		class += " phone-icon"
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
	pressed := ""
	if b.Toggle {
		pressed = fmt.Sprint(b.On)
	}
	if b.Badge != "" {
		c.use("components/badge")
	}
	icon := c.icon(b.Icon)
	if b.Off {
		icon += " off"
	}
	return c.exec(w, "components/button", struct {
		Class, Type, Label, Title, Key, Name, Value, Href, Icon, Pressed, Badge, Popover, Dialog, Form string
		IconOnly                                                                                       bool
	}{class, typ, label, title, b.Key, b.Name, b.Value, b.Href, icon, pressed, b.Badge, b.Popover, b.Dialog, b.Form, b.IconOnly})
}
