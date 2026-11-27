package showcase

import . "github.com/nobloat/ui"

var demoUser = &User{Login: "peter", Name: "Peter Spiess", Email: "peter@nobloat.org", Groups: []string{"bill-admin", "globex-editor"},
	Langs: []string{"en", "de"}, Lang: "en", Settings: "settings.html", SignOut: "#"}

func frame(here string, head *PageHead, main Node) Page {
	nav := []NavItem{{Href: "dashboard.html", Icon: IconDashboard, Label: "Dashboard"}, {Href: "invoices.html", Icon: IconFile, Label: "Invoices", Badge: "3", BadgeLabel: "3 overdue"},
		{Href: "new-customer.html", Icon: IconUsers, Label: "Customers"}}
	for i := range nav {
		nav[i].On = nav[i].Href == here
	}
	return Page{Title: "bill", App: "bill", Static: "./",
		Header: &Header{App: "bill", Home: "dashboard.html", Commands: true, User: demoUser, Nav: nav},
		Head:   head, Main: main, Palette: &Palette{Groups: []PaletteGroup{{Label: "Go to", Items: []MenuItem{
			{Href: "dashboard.html", Icon: IconDashboard, Label: "Dashboard"}, {Href: "invoices.html", Icon: IconFile, Label: "Invoices"},
			{Href: "settings.html", Icon: IconCog, Label: "Settings"}}}}},
		Footer: &Footer{App: "bill", Version: "v1.4.2", Keys: true, Support: "https://github.com/nobloat/bill/issues/new", Source: "https://github.com/nobloat/bill"}}
}

// Pages: whole pages, each rendered to sample/<name>.html, all sharing sample/ui.css and sample/ui.js.
var Pages = map[string]Page{
	"new-customer": {Title: "New customer", App: "bill", Static: "./", Main: Form{
		Action: "/customers",
		Fields: []Node{
			Field{Name: "name", Label: "Name", Placeholder: "ACME GmbH", Hint: "as on the invoice", Required: true},
			Field{Name: "email", Label: "E-mail", Type: Email, Value: "anna@acme", Err: "Not an e-mail address",
				Hint: "e.g. anna@example.org", Autocomplete: "email"},
			Field{Name: "vat", Label: "VAT id", Placeholder: "ATU12345678", Pattern: "ATU[0-9]{8}", Title: "ATU and 8 digits, e.g. ATU12345678"},
		},
		Actions: []Button{
			{Label: "Create", Icon: IconCheck, Primary: true, Key: "Ctrl Enter"},
			{Label: "Cancel", Icon: IconX, Href: "dashboard.html"},
		},
	}},
	"dashboard": func() Page {
		p := frame("dashboard.html", &PageHead{Title: "Dashboard"}, Dashboard{
			Tiles: []StatTile{Specimens["stat-tile"].(StatTile), Specimens["stat-meter"].(StatTile)},
			Cards: []Card{level2(Specimens["card"].(Card)), {Title: "Top customers", Body: []Node{Specimens["ranked"]}}}})
		p.Title = "Dashboard"
		return p
	}(),
	"invoices": func() Page {
		p := frame("invoices.html", &PageHead{Title: "Invoices", Actions: []Button{{Label: "New invoice", Icon: IconPlus, Key: "c", Primary: true, Href: "#new"}}},
			Nodes{Specimens["chips"], Specimens["table"], Specimens["pager"]})
		p.Title = "Invoices"
		return p
	}(),
	"settings": func() Page {
		p := frame("", &PageHead{Title: "Settings"}, Settings{Action: "/settings", Sections: []SettingsSection{
			Account(*demoUser, "https://auth.example.org"),
			{Title: "Invoices", Text: "Settings of this app, for everyone.", Rows: []Setting{
				{Label: "Number format", Value: Editable{Label: "Number format", Name: "number_format", Value: "YYYY-NNNN", Pattern: ".*N{2,}.*",
					Error: "Needs NN for the running number, e.g. YYYY-NNNN.", Hint: "YYYY year, NNNN running number per year"}},
				{Label: "Mails", Value: Checkbox{Name: "attach_pdf", Label: "Attach the PDF", Checked: true}},
				{Label: "Reminder after", Value: Editable{Label: "Reminder after", Name: "remind_days", Value: "14", Type: "number", Min: "1", Unit: "days", Error: "At least 1, e.g. 14."}}}},
			{Title: "Delete all data", Text: "Removes every invoice of this instance; cannot be undone.", Danger: true,
				Actions: []Button{{Label: "Delete all data", Icon: IconTrash, Danger: true}}}}})
		p.Title = "Settings"
		return p
	}(),
}

func level2(k Card) Card { k.Level = 2; return k }
