// Package showcase holds ui's specimens as Go values; its test renders them to showcase/sample/ with their bundle.
package showcase

import "github.com/nobloat/ui"

// Pages: whole pages, each rendered to sample/<name>.html, all sharing sample/ui.css.
var Pages = map[string]ui.Page{
	"new-customer": {Title: "New customer", App: "bill", Static: "./", Main: ui.Form{
		Action: "/customers",
		Fields: []ui.Node{
			ui.Field{Name: "name", Label: "Name", Placeholder: "ACME GmbH", Hint: "as on the invoice", Required: true},
			ui.Field{Name: "email", Label: "E-mail", Type: ui.Email, Value: "anna@acme", Err: "Not an e-mail address",
				Hint: "e.g. anna@example.org", Autocomplete: "email"},
			ui.Field{Name: "vat", Label: "VAT id", Placeholder: "ATU12345678", Pattern: "ATU[0-9]{8}", Title: "ATU and 8 digits, e.g. ATU12345678"},
		},
		Actions: []ui.Button{
			{Label: "Create", Icon: ui.IconCheck, Primary: true, Key: "Ctrl Enter"},
			{Label: "Cancel", Icon: ui.IconX, Href: "/customers"},
		},
	}},
}
