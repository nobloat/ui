package ui

import (
	"fmt"
	"io"
)

// FieldType is the input's type; the zero value is text.
type FieldType string

const (
	TextInput FieldType = "text"
	Password  FieldType = "password"
	Email     FieldType = "email"
	Number    FieldType = "number"
	Tel       FieldType = "tel"
	URL       FieldType = "url"
)

// Field: label above, the input, then one line: the hint, or the error in its place (Rules: Forms, Prevent input
// errors). Err says what is wrong; the hint, shown with it, says what is valid, with an example.
type Field struct {
	Name         string
	Label        Text
	Value        string
	Type         FieldType
	Placeholder  string // a realistic sample of the value
	Hint         Text
	Err          Text
	Required     bool
	Autocomplete string
	InputMode    string
	Pattern      string
	Title        Text // required with Pattern: a valid example
	MaxLength    int
}

func (f Field) Render(c *Ctx, w io.Writer) error {
	if f.Name == "" || f.Label == "" {
		return fmt.Errorf("field %q: needs a name and a label", f.Name)
	}
	if f.Pattern != "" && f.Title == "" {
		return fmt.Errorf("field %q: a pattern needs a title naming a valid example", f.Name)
	}
	typ := f.Type
	if typ == "" {
		typ = TextInput
	}
	v := struct {
		Name, Label, Value, Type, Placeholder, Hint, Err, Autocomplete, InputMode, Pattern, Title, Line, Icon string
		Required                                                                                              bool
		MaxLength                                                                                             int
	}{Name: f.Name, Label: c.text(f.Label), Value: f.Value, Type: string(typ), Placeholder: f.Placeholder, Hint: c.text(f.Hint),
		Err: c.text(f.Err), Autocomplete: f.Autocomplete, InputMode: f.InputMode, Pattern: f.Pattern, Title: c.text(f.Title),
		Required: f.Required, MaxLength: f.MaxLength}
	if f.Hint != "" || f.Err != "" {
		id, err := c.id(f.Name + "-line")
		if err != nil {
			return err
		}
		v.Line = id
	}
	if f.Err != "" {
		v.Icon = c.icon(IconError)
	}
	return c.exec(w, "components/field", v)
}
