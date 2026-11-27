package ui

import (
	"fmt"
	"io"
)

// FieldType is the input's type; the zero value is text. Date, Time and Code are text fields with their own rules.
type FieldType string

const (
	TextInput   FieldType = "text"
	Password    FieldType = "password"
	Email       FieldType = "email"
	Number      FieldType = "number"
	Tel         FieldType = "tel"
	URL         FieldType = "url"
	Multiline   FieldType = "textarea"
	Date        FieldType = "date" // dd.mm.yyyy with the browser's picker
	Time        FieldType = "time" // hh:mm, 24 h, with the browser's picker
	OneTimeCode FieldType = "code" // a one-time code: six digits, filled by password managers
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
	v := struct {
		Name, Label, Value, Type, Placeholder, Hint, Err, Autocomplete, InputMode, Pattern, Title, Line, Icon, Class string
		Picker, PickIcon, PickLabel, Step                                                                            string
		Required, Area                                                                                               bool
		MaxLength                                                                                                    int
	}{Name: f.Name, Label: c.text(f.Label), Value: f.Value, Type: string(f.Type), Placeholder: f.Placeholder, Hint: c.text(f.Hint),
		Err: c.text(f.Err), Autocomplete: f.Autocomplete, InputMode: f.InputMode, Pattern: f.Pattern, Title: c.text(f.Title),
		Required: f.Required, MaxLength: f.MaxLength}
	switch f.Type {
	case TextInput:
		v.Type = ""
	case Multiline:
		v.Type, v.Area = "", true
	case Date, Time:
		v.Picker, v.Type, v.InputMode = string(f.Type), "", "numeric"
		if f.Type == Date {
			v.PickIcon, v.PickLabel = c.icon(IconCalendar), "Pick a date"
			v.Placeholder, v.Pattern, v.Title = or(f.Placeholder, "31.12.2026"), `\d{2}\.\d{2}\.\d{4}`, or(v.Title, "dd.mm.yyyy, e.g. 31.12.2026")
		} else {
			v.PickIcon, v.PickLabel, v.Step = c.icon(IconClock), "Pick a time", "900"
			v.Placeholder, v.Pattern, v.Title = or(f.Placeholder, "14:30"), `([01]\d|2[0-3]):[0-5]\d`, or(v.Title, "hh:mm, 24 hours, e.g. 14:30")
		}
		c.use("components/picker", "components/button")
	case OneTimeCode:
		v.Class, v.Type, v.InputMode, v.Autocomplete, v.MaxLength, v.Pattern = "otp-code", "text", "numeric", "one-time-code", 6, "[0-9]{6}"
		c.use("components/otp")
	}
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

func or(s, d string) string {
	if s == "" {
		return d
	}
	return s
}
