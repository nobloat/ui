package ui

// Layer 2, blocks: bigger pieces built from components and other blocks; each type is the API of blocks/<part>/.

import (
	"fmt"
	"html/template"
	"io"
	"strings"
)

// MenuItem: a row of a menu or the palette: a link (Href) or a button (Submit with Form, or Dialog to open one).
// A Line before it separates it from the rows above.
type MenuItem struct {
	Href   string
	Icon   Icon
	Label  Text
	Key    string
	Danger bool
	Line   bool
	Form   string // the id of the form it submits (sign out); without Href and Form it is a plain button
}

type menuItem struct {
	Href, Icon, Label, Key, Form string
	Danger, Line                 bool
}

func (c *Ctx) menuItems(items []MenuItem) ([]menuItem, error) {
	v := make([]menuItem, len(items))
	for i, x := range items {
		if x.Icon == "" || x.Label == "" {
			return nil, fmt.Errorf("menu row %q: needs an icon and a label", x.Label)
		}
		if x.Key != "" {
			c.use("components/kbd")
		}
		v[i] = menuItem{x.Href, c.icon(x.Icon), c.text(x.Label), x.Key, x.Form, x.Danger, x.Line}
	}
	return v, nil
}

// Menu: a popover list of actions, opened by a button with Popover set to its ID.
type Menu struct {
	ID    string
	Items []MenuItem
}

func (m Menu) Render(c *Ctx, w io.Writer) error {
	id, err := c.id(m.ID)
	if err != nil {
		return err
	}
	items, err := c.menuItems(m.Items)
	if err != nil {
		return err
	}
	return c.exec(w, "blocks/menu", struct {
		ID    string
		Items []menuItem
	}{id, items})
}

// Dialog: the native <dialog>: a title, any content, the actions; Esc, the backdrop and × cancel. With Action its form
// posts there; otherwise it closes with the pressed button's value. Open it with a button whose Dialog is its ID.
type Dialog struct {
	ID      string
	Title   Text
	Body    []Node
	Actions []Button
	Action  string
}

func (d Dialog) Render(c *Ctx, w io.Writer) error {
	id, err := c.id(d.ID)
	if err != nil {
		return err
	}
	body, err := c.nodes(d.Body)
	if err != nil {
		return err
	}
	var actions template.HTML
	for _, b := range d.Actions {
		b.Submit = b.Href == ""
		h, err := c.node(b)
		if err != nil {
			return err
		}
		actions += h
	}
	c.use("components/button")
	return c.exec(w, "blocks/dialog", struct {
		ID, Title, Action, X string
		Body, Actions        template.HTML
	}{id, c.text(d.Title), d.Action, c.icon(IconX), body, actions})
}

// Card: a panel with any content; an optional head with the title and one icon-only action (a link to the full list).
type Card struct {
	Title  Text
	Level  int // heading level, default 2
	Action *Button
	Body   []Node
}

func (k Card) Render(c *Ctx, w io.Writer) error {
	body, err := c.nodes(k.Body)
	if err != nil {
		return err
	}
	var action template.HTML
	if k.Action != nil {
		a := *k.Action
		a.IconOnly = true
		if action, err = c.node(a); err != nil {
			return err
		}
	}
	return c.exec(w, "blocks/card", struct {
		Title        string
		H3           bool
		Action, Body template.HTML
	}{c.text(k.Title), k.Level == 3, action, body})
}

// StatTile: a number that leads to an action: one link to its list, its change, and a sparkline over Spark or a meter.
type StatTile struct {
	Href   string
	Label  Text
	Value  string
	Delta  Text
	State  State // of the change: ok, danger …
	Down   bool  // the change goes down
	Spark  []float64
	Period Text // the sparkline's period: required with Spark
	Meter  *Meter
}

func (s StatTile) Render(c *Ctx, w io.Writer) error {
	if len(s.Spark) > 0 && s.Period == "" {
		return fmt.Errorf("stat tile %q: a sparkline needs its period", s.Label)
	}
	var meter template.HTML
	if s.Meter != nil {
		var err error
		if meter, err = c.node(*s.Meter); err != nil {
			return err
		}
	}
	arrow := IconArrowUp
	if s.Down {
		arrow = IconArrowDown
	}
	v := struct {
		Href, Label, Value, Delta, State, Icon, Points, Period string
		Meter                                                  template.HTML
	}{Href: s.Href, Label: c.text(s.Label), Value: s.Value, Delta: c.text(s.Delta), State: string(s.State), Period: c.text(s.Period), Meter: meter}
	if s.Delta != "" {
		v.Icon = c.icon(arrow)
	}
	if len(s.Spark) > 1 {
		lo, hi := s.Spark[0], s.Spark[0]
		for _, x := range s.Spark {
			lo, hi = min(lo, x), max(hi, x)
		}
		var p []string
		for i, x := range s.Spark {
			y := 20.0
			if hi > lo {
				y = 36 - (x-lo)/(hi-lo)*32
			}
			p = append(p, fmt.Sprintf("%g,%g", float64(i*100/(len(s.Spark)-1)), float64(int(y*10))/10))
		}
		v.Points = strings.Join(p, " ")
	}
	return c.exec(w, "blocks/stat-tile", v)
}

// Palette: the command palette (Ctrl K): a search line over grouped rows. Rows are links or buttons, so they work
// without its script.
type Palette struct {
	Groups []PaletteGroup
}

type PaletteGroup struct {
	Label Text
	Items []MenuItem
}

func (p Palette) Render(c *Ctx, w io.Writer) error {
	type group struct {
		Label string
		Items []menuItem
	}
	gs := make([]group, len(p.Groups))
	for i, g := range p.Groups {
		items, err := c.menuItems(g.Items)
		if err != nil {
			return err
		}
		gs[i] = group{c.text(g.Label), items}
	}
	if _, err := c.id("palette"); err != nil {
		return err
	}
	c.use("blocks/dialog", "blocks/menu", "components/kbd")
	return c.exec(w, "blocks/palette", gs)
}

// Board: one column per state; the items are the app's own nodes.
type Board []BoardColumn

type BoardColumn struct {
	ID    string
	State State
	Name  string
	New   string // the link that creates an item in this column
	Items []Node
}

func (b Board) Render(c *Ctx, w io.Writer) error {
	type col struct {
		ID, State, Name, New, Plus string
		Count                      int
		Items                      template.HTML
	}
	cols := make([]col, len(b))
	for i, x := range b {
		id, err := c.id(x.ID)
		if err != nil {
			return err
		}
		items, err := c.nodes(x.Items)
		if err != nil {
			return err
		}
		cols[i] = col{id, string(x.State), x.Name, x.New, "", len(x.Items), items}
		if x.New != "" {
			cols[i].Plus = c.icon(IconPlus)
		}
	}
	c.use("components/button")
	return c.exec(w, "blocks/board", cols)
}

// Settings: the settings page is only a stack of these sections (Rules: Settings page). Every control saves as it
// changes: Action is where they post name=value.
type Settings struct {
	Action   string
	Sections []SettingsSection
}

type SettingsSection struct {
	Title   Text
	Text    Text
	Danger  bool
	Rows    []Setting
	Actions []Button
}

type Setting struct {
	Label Text
	Value Node
}

func (s Settings) Render(c *Ctx, w io.Writer) error {
	type row struct {
		Label string
		Value template.HTML
	}
	type section struct {
		Title, Text string
		Danger      bool
		Rows        []row
		Actions     template.HTML
	}
	ss := make([]section, len(s.Sections))
	for i, x := range s.Sections {
		ss[i] = section{Title: c.text(x.Title), Text: c.text(x.Text), Danger: x.Danger}
		for _, r := range x.Rows {
			h, err := c.node(r.Value)
			if err != nil {
				return err
			}
			ss[i].Rows = append(ss[i].Rows, row{c.text(r.Label), h})
		}
		for _, b := range x.Actions {
			h, err := c.node(b)
			if err != nil {
				return err
			}
			ss[i].Actions += h
		}
	}
	c.use("components/message", "components/spinner")
	return c.exec(w, "blocks/settings", struct {
		Action   string
		Sections []section
	}{s.Action, ss})
}

// Account is the first settings section of every app (Rules: Settings page): who, the groups from auth, where to manage
// the account, language and theme; sign out at the end of the User row.
func Account(u User, authURL string) SettingsSection {
	groups := make(Nodes, len(u.Groups))
	for i, g := range u.Groups {
		groups[i] = groupTag(g)
	}
	return SettingsSection{Title: "Account", Rows: []Setting{
		{Label: "User", Value: Nodes{Code(u.Login), Button{Label: "Sign out", Icon: IconPower, Submit: true, Form: "nb-signout"}}},
		{Label: "E-mail", Value: Plain(u.Email)},
		{Label: "Name", Value: Plain(u.Name)},
		{Label: "Groups", Value: groups},
		{Label: "Via", Value: Link{Href: authURL, Label: Text(strings.TrimPrefix(strings.TrimPrefix(authURL, "https://"), "http://")), External: true}},
		{Label: "Language", Value: Segmented{Name: "lang", Label: "Language", Options: u.langs()}},
		{Label: "Theme", Value: Segmented{Name: "theme", Label: "Theme", Options: []Option{
			{Value: "auto", Label: "Auto", Icon: IconContrast, Checked: u.Theme == ""},
			{Value: "light", Label: "Light", Icon: IconSun, Checked: u.Theme == "light"},
			{Value: "dark", Label: "Dark", Icon: IconMoon, Checked: u.Theme == "dark"}}}},
	}}
}

type groupTag string

func (g groupTag) Render(c *Ctx, w io.Writer) error {
	c.use("components/tag")
	return c.exec(w, "components/tag/group", struct{ Label, Icon string }{string(g), c.icon(IconUsers)})
}

// User: who is signed in, from auth's Remote-* headers.
type User struct {
	Login, Name, Email, Initial string
	Groups                      []string
	Lang                        string   // the current language
	Langs                       []string // the languages the app has
	Theme                       string   // "", "light" or "dark"
	Settings                    string   // the settings page, default /settings
	SignOut                     string   // where Sign out posts (auth's logout)
}

func (u User) langs() []Option {
	var os []Option
	for _, l := range u.Langs {
		os = append(os, Option{Value: l, Label: Text(strings.ToUpper(l)), Checked: l == u.Lang})
	}
	return os
}

// NavItem: one of the app's places in the header's tab bar.
type NavItem struct {
	Href       string
	Icon       Icon
	Label      Text
	Badge      string
	BadgeLabel Text // what the badge counts: "3 overdue"
	On         bool
}

// Header: the app header: logo, Commands (when the page has a palette), the user menu, and the nav under it.
type Header struct {
	App      string // the app's name after the mark
	Char     string // the mark's character, default ◆
	Home     string
	Commands bool
	User     *User
	Nav      []NavItem
}

func (h Header) Render(c *Ctx, w io.Writer) error {
	type nav struct {
		Href, Icon, Label, Badge, BadgeLabel string
		On                                   bool
	}
	v := struct {
		App, Char, Home, Terminal, Cog, Power, Initial, Name, Email, Settings, SignOut string
		Commands                                                                       bool
		User                                                                           bool
		Theme, Langs                                                                   template.HTML
		Nav                                                                            []nav
	}{App: h.App, Char: or(h.Char, "◆"), Home: or(h.Home, "/"), Commands: h.Commands}
	if h.Commands {
		v.Terminal = c.icon(IconTerminal)
		c.use("components/button", "components/kbd")
	}
	if u := h.User; u != nil {
		if u.SignOut == "" {
			return fmt.Errorf("header: the user menu needs SignOut")
		}
		v.User, v.Initial, v.Name, v.Email, v.Settings, v.SignOut = true, or(u.Initial, strings.ToUpper(u.Login[:1])), or(u.Name, u.Login), u.Email, or(u.Settings, "/settings"), u.SignOut
		v.Cog, v.Power = c.icon(IconCog), c.icon(IconPower)
		var err error
		if v.Theme, err = c.node(Segmented{Name: "theme", Label: "Theme", Options: []Option{
			{Value: "auto", Icon: IconContrast, Label: "auto", Checked: u.Theme == ""}, {Value: "light", Icon: IconSun, Label: "light", Checked: u.Theme == "light"},
			{Value: "dark", Icon: IconMoon, Label: "dark", Checked: u.Theme == "dark"}}}); err != nil {
			return err
		}
		if len(u.Langs) > 1 {
			if v.Langs, err = c.node(Segmented{Name: "lang", Label: "Language", Options: u.langs()}); err != nil {
				return err
			}
		}
		if _, err := c.id("nb-user"); err != nil {
			return err
		}
		c.use("blocks/menu", "blocks/user-menu", "components/avatar", "components/kbd", "components/theme-switch")
	}
	for _, n := range h.Nav {
		v.Nav = append(v.Nav, nav{n.Href, c.icon(n.Icon), c.text(n.Label), n.Badge, c.text(n.BadgeLabel), n.On})
		if n.Badge != "" {
			c.use("components/badge")
		}
	}
	if len(v.Nav) > 0 {
		c.use("blocks/nav", "components/tabs")
	}
	return c.exec(w, "blocks/header", v)
}

// Footer: the product and its version left; shortcuts, support and source right.
type Footer struct {
	App       string // nobloat/<App>
	Version   string
	Changelog string // default /changelog
	Support   string // where to report a problem (the issue form)
	Source    string
	Keys      bool // the page has shortcuts: show "? shortcuts"
}

func (f Footer) Render(c *Ctx, w io.Writer) error {
	v := struct {
		App, Version, Changelog, Support, Source, Icon string
		Keys                                           bool
	}{f.App, f.Version, or(f.Changelog, "/changelog"), f.Support, f.Source, "", f.Keys}
	if f.Support != "" {
		v.Icon = c.icon(IconSupport)
	}
	if f.Keys {
		c.use("components/kbd")
	}
	return c.exec(w, "blocks/footer", v)
}

// PageHead: breadcrumbs below the top level, the title (the page's h1) with its state, and the page's actions; further
// actions in a More menu (from three on, Rules: Detail).
type PageHead struct {
	Crumbs  Breadcrumbs
	Title   Text
	State   *Status
	Actions []Button
	More    []MenuItem
}

func (p PageHead) Render(c *Ctx, w io.Writer) error {
	v := struct {
		Title                  string
		Crumbs, State, Actions template.HTML
	}{Title: c.text(p.Title)}
	var err error
	if len(p.Crumbs) > 0 {
		if v.Crumbs, err = c.node(p.Crumbs); err != nil {
			return err
		}
	}
	if p.State != nil {
		if v.State, err = c.node(*p.State); err != nil {
			return err
		}
	}
	var acts strings.Builder
	for _, b := range p.Actions { // the others first, then More, then the primary action last
		if !b.Primary {
			if err := b.Render(c, &acts); err != nil {
				return err
			}
		}
	}
	if len(p.More) > 0 {
		if err := (Button{Label: "More", Icon: IconMore, IconOnly: true, Popover: "nb-more"}).Render(c, &acts); err != nil {
			return err
		}
		if err := (Menu{ID: "nb-more", Items: p.More}).Render(c, &acts); err != nil {
			return err
		}
	}
	for _, b := range p.Actions {
		if b.Primary {
			if err := b.Render(c, &acts); err != nil {
				return err
			}
		}
	}
	v.Actions = template.HTML(acts.String())
	return c.exec(w, "blocks/page-head", v)
}
