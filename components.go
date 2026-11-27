package ui

// Layer 1, components: built from tokens only. Each type is the API of its part in components/<part>/; its template there
// prints what Render prepared. Rules: skill/design-system.md.

import (
	"fmt"
	"html/template"
	"io"
	"strings"
)

// State is what a state colour means; never a hue (Rules: States).
type State string

const (
	OK       State = "ok"
	Warn     State = "warn"
	Danger   State = "danger"
	Info     State = "info"
	Disabled State = "disabled"
)

// Plain is text in a slot (escaped); Code the same in code style.
type Plain Text
type Code string

func (p Plain) Render(c *Ctx, w io.Writer) error {
	_, err := io.WriteString(w, template.HTMLEscapeString(c.text(Text(p))))
	return err
}

func (s Code) Render(c *Ctx, w io.Writer) error {
	_, err := io.WriteString(w, "<code>"+template.HTMLEscapeString(string(s))+"</code>")
	return err
}

// Nodes puts several nodes into one slot, separated by a space.
type Nodes []Node

func (ns Nodes) Render(c *Ctx, w io.Writer) error {
	for i, n := range ns {
		if i > 0 {
			io.WriteString(w, " ")
		}
		if err := n.Render(c, w); err != nil {
			return err
		}
	}
	return nil
}

// Link: an inline link (Rules: Links). External opens a new tab with the external icon.
type Link struct {
	Href     string
	Label    Text
	External bool
}

func (l Link) Render(c *Ctx, w io.Writer) error {
	return c.exec(w, "components/link", struct {
		Href, Label string
		External    bool
	}{l.Href, c.text(l.Label), l.External})
}

// Option: one choice of a select, radios or a segmented control.
type Option struct {
	Value   string
	Label   Text
	Icon    Icon // segmented only
	Checked bool
}

type optionView struct {
	Value, Label, Icon string
	Checked            bool
}

func (c *Ctx) options(os []Option) []optionView {
	v := make([]optionView, len(os))
	for i, o := range os {
		v[i] = optionView{Value: o.Value, Label: c.text(o.Label), Checked: o.Checked}
		if o.Icon != "" {
			v[i].Icon = c.icon(o.Icon)
		}
	}
	return v
}

// Select: one of many in a native select, with a label.
type Select struct {
	Name    string
	Label   Text
	Options []Option // Checked marks the selected one
}

func (s Select) Render(c *Ctx, w io.Writer) error {
	if s.Name == "" || s.Label == "" {
		return fmt.Errorf("select %q: needs a name and a label", s.Name)
	}
	return c.exec(w, "components/select", struct {
		Name, Label string
		Options     []optionView
	}{s.Name, c.text(s.Label), c.options(s.Options)})
}

// Checkbox: one yes or no with its label; several stack in Choices.
type Checkbox struct {
	Name    string
	Value   string // sent when checked; empty is "on"
	Label   Text
	Checked bool
}

func (b Checkbox) Render(c *Ctx, w io.Writer) error {
	if b.Name == "" || b.Label == "" {
		return fmt.Errorf("checkbox %q: needs a name and a label", b.Name)
	}
	return c.exec(w, "components/choice", struct {
		Type, Name, Value, Label string
		Checked                  bool
	}{"checkbox", b.Name, b.Value, c.text(b.Label), b.Checked})
}

// Choices stacks checkboxes.
type Choices []Checkbox

func (cs Choices) Render(c *Ctx, w io.Writer) error {
	var b strings.Builder
	for _, x := range cs {
		if err := x.Render(c, &b); err != nil {
			return err
		}
	}
	_, err := io.WriteString(w, `<div class="choices">`+b.String()+`</div>`)
	return err
}

// Radios: one of a few, all visible, stacked; Label names the group.
type Radios struct {
	Name    string
	Label   Text
	Options []Option
}

func (r Radios) Render(c *Ctx, w io.Writer) error {
	if r.Name == "" || r.Label == "" {
		return fmt.Errorf("radios %q: needs a name and a label", r.Name)
	}
	return c.exec(w, "components/choice/radios", struct {
		Name, Label string
		Options     []optionView
	}{r.Name, c.text(r.Label), c.options(r.Options)})
}

// Segmented: one of two to five, side by side; radios underneath, so it works without JavaScript.
type Segmented struct {
	Name    string
	Label   Text // the group's name for screen readers
	Options []Option
}

func (s Segmented) Render(c *Ctx, w io.Writer) error {
	if s.Name == "" || s.Label == "" || len(s.Options) < 2 || len(s.Options) > 5 {
		return fmt.Errorf("segmented %q: needs a name, a label and two to five options", s.Name)
	}
	return c.exec(w, "components/segmented", struct {
		Name, Label string
		Options     []optionView
	}{s.Name, c.text(s.Label), c.options(s.Options)})
}

// Drop: a drop zone for files; always names what is allowed (Rules: Forms, uploads).
type Drop struct {
	Name     string
	Accept   string // ".pdf,.png,.jpg"
	Multiple bool
	What     Text // "Drop invoices here"
	Or       Text // "or choose files"
	Allowed  Text // "PDF, PNG or JPG, at most 10 MB each"
}

func (d Drop) Render(c *Ctx, w io.Writer) error {
	if d.Name == "" || d.Allowed == "" {
		return fmt.Errorf("drop %q: needs a name and what is allowed", d.Name)
	}
	return c.exec(w, "components/drop", struct {
		Name, Accept, What, Or, Allowed, Icon string
		Multiple                              bool
	}{d.Name, d.Accept, c.text(d.What), c.text(d.Or), c.text(d.Allowed), c.icon(IconUpload), d.Multiple})
}

// Avatar: a person as a picture or their initial; the name sits beside it or in Label.
type Avatar struct {
	Initial string
	Img     string
	Label   Text // when the name is not beside it
	Small   bool
}

func (a Avatar) Render(c *Ctx, w io.Writer) error {
	return c.exec(w, "components/avatar", struct {
		Initial, Img, Label string
		Small               bool
	}{a.Initial, a.Img, c.text(a.Label), a.Small})
}

// Status: a state as a dot and a word (Rules: never colour alone).
type Status struct {
	State State
	Label Text
}

func (s Status) Render(c *Ctx, w io.Writer) error {
	if s.Label == "" {
		return fmt.Errorf("status %q: needs a word", s.State)
	}
	return c.exec(w, "components/status", struct{ State, Label string }{string(s.State), c.text(s.Label)})
}

// Chips: filter chips above a list; each a link with its count.
type Chips struct {
	Label Text
	Items []Chip
}

type Chip struct {
	Href  string
	Icon  Icon
	Label Text
	Count string
	On    bool
}

func (cs Chips) Render(c *Ctx, w io.Writer) error {
	type item struct {
		Href, Icon, Label, Count string
		On                       bool
	}
	items := make([]item, len(cs.Items))
	for i, x := range cs.Items {
		if x.Icon == "" {
			return fmt.Errorf("chip %q: needs an icon", x.Label)
		}
		items[i] = item{x.Href, c.icon(x.Icon), c.text(x.Label), x.Count, x.On}
	}
	return c.exec(w, "components/chip", struct {
		Label string
		Items []item
	}{c.text(cs.Label), items})
}

// Tag: a user's own word in their colour.
type Tag struct {
	Href  string
	Label string
	Color string // #rrggbb
}

func (t Tag) Render(c *Ctx, w io.Writer) error {
	if !hexColor(t.Color) {
		return fmt.Errorf("tag %q: colour %q is not #rrggbb", t.Label, t.Color)
	}
	return c.exec(w, "components/tag", struct {
		Href, Label, Icon string
		Style             template.CSS
	}{t.Href, t.Label, c.icon(IconTag), template.CSS("--c:" + t.Color)})
}

func hexColor(s string) bool {
	if len(s) != 7 || s[0] != '#' {
		return false
	}
	for _, r := range s[1:] {
		if !strings.ContainsRune("0123456789abcdefABCDEF", r) {
			return false
		}
	}
	return true
}

// ObjectID: a ticket key in code style with a copy button (Rules: Ids).
type ObjectID string

func (o ObjectID) Render(c *Ctx, w io.Writer) error {
	c.use("components/button")
	return c.exec(w, "components/object-id", struct{ ID, Icon string }{string(o), c.icon(IconCopy)})
}

// Message: one sentence, or a bold title and a sentence. Auto closes by itself (never for Danger).
type Message struct {
	State State
	Title Text
	Text  Text
	Auto  bool
}

func (m Message) Render(c *Ctx, w io.Writer) error {
	if m.Auto && m.State == Danger {
		return fmt.Errorf("message %q: an error never closes by itself", m.Text)
	}
	icon := map[State]Icon{OK: IconOk, Warn: IconWarning, Danger: IconError, Info: IconInfo, Disabled: IconInfo}[m.State]
	role := "status"
	if m.State == Danger {
		role = "alert"
	}
	c.use("components/button")
	return c.exec(w, "components/message", struct {
		State, Role, Icon, X, Title, Text string
		Auto                              bool
	}{string(m.State), role, c.icon(icon), c.icon(IconX), c.text(m.Title), c.text(m.Text), m.Auto})
}

// Progress: a task that runs, with what and how far (Rules: Waiting).
type Progress struct {
	Label   Text // "Sending newsletter · 312 of 1.200"
	Percent int
}

func (p Progress) Render(c *Ctx, w io.Writer) error {
	return c.exec(w, "components/bars/progress", struct {
		Label   string
		Percent int
		Style   template.CSS
	}{c.text(p.Label), p.Percent, pct(p.Percent)})
}

func pct(n int) template.CSS { return template.CSS(fmt.Sprintf("--value:%d%%", max(0, min(100, n)))) }

// Meter: one ratio, with its words.
type Meter struct {
	Label   Text
	Value   Text // "7,0 of 10 GB"
	Percent int
	State   State
}

func (m Meter) Render(c *Ctx, w io.Writer) error {
	return c.exec(w, "components/bars/meter", struct {
		Label, Value, State string
		Style               template.CSS
	}{c.text(m.Label), c.text(m.Value), string(m.State), pct(m.Percent)})
}

// Ranked: parts of a whole as bars, largest first.
type Ranked []Rank

type Rank struct {
	Label   string
	Value   string // the formatted number
	Percent int    // of the largest
}

func (r Ranked) Render(c *Ctx, w io.Writer) error {
	type item struct {
		Label, Value string
		Style        template.CSS
	}
	items := make([]item, len(r))
	for i, x := range r {
		items[i] = item{x.Label, x.Value, pct(x.Percent)}
	}
	return c.exec(w, "components/bars/ranked", items)
}

// Table: rows people compare across columns. A column with Sort is a link that sorts; Number aligns right.
type Table struct {
	Columns []Column
	Rows    [][]Node
	Total   Text   // the label of the footer row
	Totals  []Node // the last columns of the footer row
}

type Column struct {
	Label  Text
	Href   string // sorts by this column
	Sort   string // "ascending" or "descending" when sorted by it
	Number bool
}

func (t Table) Render(c *Ctx, w io.Writer) error {
	type col struct {
		Label, Href, Sort string
		Number            bool
	}
	type cell struct {
		HTML   template.HTML
		Number bool
	}
	cols := make([]col, len(t.Columns))
	for i, x := range t.Columns {
		cols[i] = col{c.text(x.Label), x.Href, x.Sort, x.Number}
	}
	rows := make([][]cell, len(t.Rows))
	for i, r := range t.Rows {
		if len(r) != len(cols) {
			return fmt.Errorf("table: row %d has %d cells for %d columns", i, len(r), len(cols))
		}
		for j, n := range r {
			h, err := c.node(n)
			if err != nil {
				return err
			}
			rows[i] = append(rows[i], cell{h, cols[j].Number})
		}
	}
	var totals []cell
	for j, n := range t.Totals {
		h, err := c.node(n)
		if err != nil {
			return err
		}
		totals = append(totals, cell{h, cols[len(cols)-len(t.Totals)+j].Number})
	}
	return c.exec(w, "components/table", struct {
		Columns []col
		Rows    [][]cell
		Total   string
		Span    int
		Totals  []cell
	}{cols, rows, c.text(t.Total), len(cols) - len(t.Totals), totals})
}

// Rows: a row list, for short lists of objects with a few facts.
type Rows []Row

type Row struct {
	State  State
	Href   string
	Label  string
	Meta   string
	Number string
}

func (r Rows) Render(c *Ctx, w io.Writer) error { return c.exec(w, "components/row-list", r) }

// Empty: what is missing, why, and the way on.
type Empty struct {
	Icon   Icon
	Title  Text
	Text   Text
	Action *Button // usually the create action
}

func (e Empty) Render(c *Ctx, w io.Writer) error {
	var action template.HTML
	if e.Action != nil {
		var err error
		if action, err = c.node(*e.Action); err != nil {
			return err
		}
	}
	return c.exec(w, "components/empty", struct {
		Icon, Title, Text string
		Action            template.HTML
	}{c.icon(e.Icon), c.text(e.Title), c.text(e.Text), action})
}

// InfoGrid: facts of an object, label left, value right.
type InfoGrid []Fact

type Fact struct {
	Label Text
	Value Node
}

func (g InfoGrid) Render(c *Ctx, w io.Writer) error {
	type item struct {
		Label string
		Value template.HTML
	}
	items := make([]item, len(g))
	for i, x := range g {
		h, err := c.node(x.Value)
		if err != nil {
			return err
		}
		items[i] = item{c.text(x.Label), h}
	}
	return c.exec(w, "components/info-grid", items)
}

// Tabs: views of one object as links; the current one is On.
type Tabs struct {
	Label Text
	Items []Tab
}

type Tab struct {
	Href  string
	Icon  Icon
	Label Text
	On    bool
}

func (t Tabs) Render(c *Ctx, w io.Writer) error {
	type item struct {
		Href, Icon, Label string
		On                bool
	}
	items := make([]item, len(t.Items))
	for i, x := range t.Items {
		items[i] = item{x.Href, c.icon(x.Icon), c.text(x.Label), x.On}
	}
	return c.exec(w, "components/tabs", struct {
		Label string
		Items []item
	}{c.text(t.Label), items})
}

// Pager: numbered pages and the position in words. A PageLink without Href is a gap (…).
type Pager struct {
	Prev, Next string
	Pages      []PageLink
	Position   Text // "21–40 of 128"
}

type PageLink struct {
	Href  string
	Label string
	On    bool
}

func (p Pager) Render(c *Ctx, w io.Writer) error {
	v := struct {
		Prev, Next, Left, Right, Position string
		Pages                             []PageLink
	}{Prev: p.Prev, Next: p.Next, Position: c.text(p.Position), Pages: p.Pages}
	if p.Prev != "" {
		v.Left = c.icon(IconChevronLeft)
	}
	if p.Next != "" {
		v.Right = c.icon(IconChevronRight)
	}
	return c.exec(w, "components/pager", v)
}

// Breadcrumbs: the parents with their icons, the current page last (no link).
type Breadcrumbs []Crumb

type Crumb struct {
	Href  string
	Icon  Icon
	Label Text
}

func (b Breadcrumbs) Render(c *Ctx, w io.Writer) error {
	type item struct{ Href, Icon, Label string }
	items := make([]item, len(b))
	for i, x := range b {
		items[i] = item{x.Href, "", c.text(x.Label)}
		if x.Icon != "" && i < len(b)-1 {
			items[i].Icon = c.icon(x.Icon)
		}
	}
	return c.exec(w, "components/breadcrumbs", items)
}

// Quote: someone else's words, who said them and where.
type Quote struct {
	Text Text
	Who  string
	Work string
}

func (q Quote) Render(c *Ctx, w io.Writer) error {
	return c.exec(w, "components/quote", struct{ Text, Who, Work string }{c.text(q.Text), q.Who, q.Work})
}

// Arrow connects two parts in a diagram: Dir right, left, down, up, left-right or up-down; Dashed for what is optional.
type Arrow struct {
	Dir           string
	Dashed        bool
	Before, After Text // above and below (horizontal), left and right (vertical)
}

func (a Arrow) Render(c *Ctx, w io.Writer) error {
	return c.exec(w, "components/arrow", struct {
		Dir, Before, After string
		Dashed             bool
	}{a.Dir, c.text(a.Before), c.text(a.After), a.Dashed})
}

// Elements: the custom elements and the types whose attr tags are their attributes (observedAttributes in their script).
var Elements = map[string]any{"nb-editable": Editable{}}

// Editable: a value that saves on its own, edited in place (custom element nb-editable). The attr tags are its attributes;
// a test checks them against observedAttributes in editable.js.
type Editable struct {
	Label   Text   `attr:"label"`
	Value   string `attr:"value"`
	Type    string `attr:"type"` // input type, default text
	Unit    string `attr:"unit"` // shown after the value
	Min     string `attr:"min"`
	Pattern string `attr:"pattern"`
	Error   Text   `attr:"error"`  // what is valid, with an example
	Name    string `attr:"name"`   // the posted name; default the label
	Action  string `attr:"action"` // where it posts name=value; default the nearest data-action
	Hint    Text   // the line under it, also where the error shows
}

func (e Editable) Render(c *Ctx, w io.Writer) error {
	if e.Label == "" || e.Name == "" {
		return fmt.Errorf("editable %q: needs a label and a name", e.Label)
	}
	if e.Pattern != "" && e.Error == "" {
		return fmt.Errorf("editable %q: a pattern needs an error naming a valid example", e.Label)
	}
	id, err := c.id(e.Name + "-hint")
	if err != nil {
		return err
	}
	shown := e.Value
	if e.Unit != "" {
		shown += " " + e.Unit
	}
	c.use("components/field", "components/button", "components/message")
	label := c.text(e.Label)
	return c.exec(w, "components/editable", struct {
		Label, Value, Shown, Type, Unit, Min, Pattern, Error, Name, Action, Hint, ID, Icon, Edit string
	}{label, e.Value, shown, e.Type, e.Unit, e.Min, e.Pattern, c.text(e.Error), e.Name, e.Action, c.text(e.Hint), id,
		c.icon(IconEdit), "Edit " + label})
}

// ThemeSwitch: auto, light or dark with CSS alone; the server checks the saved one.
type ThemeSwitch struct{ Saved string } // "", "light" or "dark"

func (t ThemeSwitch) Render(c *Ctx, w io.Writer) error {
	for _, i := range []Icon{IconContrast, IconSun, IconMoon} {
		c.icon(i)
	}
	c.use("components/segmented", "components/button")
	return c.exec(w, "components/theme-switch", t.Saved)
}
