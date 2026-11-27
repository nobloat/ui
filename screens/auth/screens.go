// Package auth holds the screens of nobloat/auth as Go values: every page the IdP shows, with realistic data. The
// showcase test renders them to screens/auth/<name>.html with their bundle (ui.css, ui.js); auth's handlers build the
// same values from its state when it moves to typed pages.
package auth

import . "github.com/nobloat/ui"

const app = "auth"

var admin = &User{Login: "peter", Name: "Peter Spiess", Email: "peter@nobloat.org", Groups: []string{"auth-admin", "bill-admin"},
	Langs: []string{"en", "de"}, Lang: "en", Settings: "account.html", SignOut: "logout.html"}

// signedIn: a page in auth's frame: Apps, Account, and for admins Users, Roles, History.
func signedIn(title Text, here string, head *PageHead, main Node) Page {
	nav := []NavItem{{Href: "portal.html", Icon: IconHome, Label: "Apps"}, {Href: "account.html", Icon: IconUser, Label: "Account"},
		{Href: "users.html", Icon: IconUsers, Label: "Users"}, {Href: "roles.html", Icon: IconKey, Label: "Roles"},
		{Href: "history.html", Icon: IconAudit, Label: "History"}}
	for i := range nav {
		nav[i].On = nav[i].Href == here
	}
	if head == nil {
		head = &PageHead{Title: title}
	}
	return Page{Title: title, App: app, Static: "./", Head: head, Main: main,
		Header: &Header{App: app, Char: "◆", Home: "portal.html", User: admin, Nav: nav},
		Footer: &Footer{App: app, Version: "v2.3.0", Support: "https://github.com/nobloat/auth/issues/new", Source: "https://github.com/nobloat/auth"}}
}

// bare: sign-in pages: no header, one small form.
func bare(title Text, main Node) Page {
	return Page{Title: title, App: app, Static: "./", Narrow: true, Main: main}
}

func signIn(err Text) Page {
	pass := Field{Name: "password", Label: "Password", Type: Password, Required: true, Autocomplete: "current-password"}
	if err != "" {
		pass.Err = err
	}
	return bare("Sign in", Nodes{
		Para{Plain("Sign in to continue to bill")},
		Form{Action: "/login", Fields: []Node{
			Field{Name: "username", Label: "E-mail", Type: Email, Required: true, Autocomplete: "username", Placeholder: "anna@example.org", Value: map[bool]string{true: "peter@nobloat.org"}[err != ""]},
			pass,
		}, Actions: []Button{{Label: "Sign in", Icon: IconLogIn, Primary: true}}},
		Para{Link{Href: "forgot.html", Label: "Forgot password?"}},
	})
}

// Pages: every screen of auth, by file name.
var Pages = map[string]Page{
	"login":       signIn(""),
	"login-wrong": signIn("Wrong e-mail or password."),
	"totp": bare("Second step", Nodes{
		Para{Plain("Code from your authenticator app")},
		Form{Action: "/login/totp", Fields: []Node{Field{Name: "code", Label: "6-digit code", Type: OneTimeCode, Required: true}},
			Actions: []Button{{Label: "Continue", Icon: IconArrowRight, Primary: true}}},
		Para{Plain("Lost your device? Ask an admin.")},
	}),
	"forgot": bare("Forgot password", Nodes{
		Form{Action: "/forgot", Fields: []Node{Field{Name: "login", Label: "E-mail or username", Required: true, Autocomplete: "username", Placeholder: "anna@example.org"}},
			Actions: []Button{{Label: "Send link", Icon: IconSend, Primary: true}, {Label: "Sign in", Icon: IconArrowLeft, Href: "login.html"}}},
	}),
	"forgot-sent": bare("Forgot password", Nodes{
		Message{State: OK, Text: "If an account exists for peter@nobloat.org, a link is on its way. It is valid for 1 hour."},
		Button{Label: "Sign in", Icon: IconArrowLeft, Href: "login.html"},
	}),
	"setup": bare("Protect your account", Nodes{
		Para{Plain("bill requires a second step. Scan the code with an authenticator app or password manager.")},
		Image{Src: "qr-demo.svg", Alt: "QR code for your authenticator app", Width: 200},
		InfoGrid{{Label: "Or enter", Value: ObjectID("JBSWY3DPEHPK3PXP")}, {Label: "Type", Value: Plain("SHA1 · 6 digits · 30 s")}},
		Form{Action: "/totp/setup", Fields: []Node{Field{Name: "code", Label: "Code shown in the app", Type: OneTimeCode, Required: true}},
			Actions: []Button{{Label: "Activate", Icon: IconCheck, Primary: true}}},
	}),
	"password": bare("New password", Nodes{
		Form{Action: "/reset", Fields: []Node{
			Field{Name: "password", Label: "New password", Type: Password, Required: true, Autocomplete: "new-password", Hint: "at least 12 characters"},
			Field{Name: "again", Label: "Repeat", Type: Password, Required: true, Autocomplete: "new-password"},
		}, Actions: []Button{{Label: "Save and sign in", Icon: IconCheck, Primary: true}}},
		Para{Plain("You will be signed out on all other devices.")},
	}),
	"logout": bare("Sign out everywhere?", Nodes{
		Para{Plain("Peter Spiess will be signed out of auth and on every other device. Apps with their own sign-in (OIDC) keep their session until it ends.")},
		Form{Action: "/logout", Actions: []Button{{Label: "Sign out", Icon: IconPower, Primary: true}, {Label: "Back to apps", Icon: IconArrowLeft, Href: "portal.html"}}},
	}),
	"logged-out": bare("Signed out", Nodes{
		Message{State: OK, Text: "You are signed out."},
		Button{Label: "Sign in", Icon: IconLogIn, Href: "login.html", Primary: true},
	}),
	"saml": bare("Signing in to BookStack", Nodes{
		Para{Plain("Your browser continues to BookStack. Without JavaScript, press Continue.")},
		Form{Action: "https://books.example.org/saml2/acs", Actions: []Button{{Label: "Continue to BookStack", Icon: IconArrowRight, Primary: true}}},
	}),
	"error": bare("No access to bill", Nodes{
		Status{State: Danger, Label: "403"},
		Empty{Icon: IconLock, Title: "bill needs a group you do not have",
			Text:   "Signed in as peter (groups: globex-editor). Members of bill-admin or bill-company-acme-viewer can open it; ask an administrator.",
			Action: &Button{Label: "Back to apps", Icon: IconHome, Href: "portal.html", Primary: true}},
		Para{Link{Href: "login.html", Label: "Sign in as someone else"}},
	}),
	"message": bare("Link expired", Nodes{
		Message{State: Warn, Title: "This link is no longer valid.", Text: "Links work once and for 1 hour. Ask for a new one."},
		Button{Label: "Send a new link", Icon: IconSend, Href: "forgot.html", Primary: true},
	}),

	"portal": signedIn("Hello Peter Spiess", "portal.html", nil, Dashboard{Cards: []Card{
		{Title: "bill", Action: &Button{Label: "Open bill", Icon: IconExternal, Href: "https://bill.example.org"}, Body: []Node{Plain("Invoices, customers and payments.")}},
		{Title: "track", Action: &Button{Label: "Open track", Icon: IconExternal, Href: "https://track.example.org"}, Body: []Node{Plain("Time on projects, weekly and monthly.")}},
		{Title: "Grafana", Action: &Button{Label: "Open Grafana", Icon: IconExternal, Href: "https://grafana.example.org"}, Body: []Node{Plain("Dashboards of the whole system.")}},
		{Title: "tax", Body: []Node{Status{State: Disabled, Label: "no access"}, Plain(" needs tax-company-acme-viewer")}},
	}}),
	"account": signedIn("Account", "account.html", nil, Settings{Action: "/account", Sections: []SettingsSection{
		{Title: "Account", Rows: []Setting{
			{Label: "User", Value: Code("peter")},
			{Label: "E-mail", Value: Plain("peter@nobloat.org")},
			{Label: "Name", Value: Editable{Label: "Name", Name: "name", Value: "Peter Spiess", Hint: "shown in every app"}},
			{Label: "Role", Value: Plain("Administrator")},
		}},
		{Title: "Where your access comes from", Rows: []Setting{
			{Label: "Groups", Value: Nodes{Tag{Href: "users.html?group=auth-admin", Label: "auth-admin", Color: "#7c3aed"}, Tag{Href: "users.html?group=bill-admin", Label: "bill-admin", Color: "#0891b2"}}},
			{Label: "Via", Value: Plain("assigned directly")},
		}},
		{Title: "Sign-in", Text: "Your password and second step.", Rows: []Setting{
			{Label: "Password", Value: Nodes{Plain("changed 12.03.2026"), Button{Label: "Change", Icon: IconEdit, Href: "password.html"}}},
			{Label: "Authenticator", Value: Nodes{Status{State: OK, Label: "active"}, Button{Label: "Replace", Icon: IconRefresh, Href: "setup.html"}}},
			{Label: "Sessions", Value: Nodes{Plain("last sign-in 27.11.2026 08:12"), Button{Label: "Sign out everywhere", Icon: IconPower, Href: "logout.html"}}},
		}},
		{Title: "Preferences", Rows: []Setting{
			{Label: "Language", Value: Segmented{Name: "lang", Label: "Language", Options: []Option{{Value: "en", Label: "English", Checked: true}, {Value: "de", Label: "Deutsch"}}}},
			{Label: "Theme", Value: Segmented{Name: "theme", Label: "Theme", Options: []Option{{Value: "auto", Label: "Auto", Icon: IconContrast, Checked: true}, {Value: "light", Label: "Light", Icon: IconSun}, {Value: "dark", Label: "Dark", Icon: IconMoon}}}},
		}},
		{Title: "API keys", Text: "A key opens one app as this account, with its current groups.", Rows: []Setting{
			{Label: "deploy script", Value: Nodes{Code("KEY-7F3A"), Plain(" bill · expires 31.12.2026")}},
		}, Actions: []Button{{Label: "Create key", Icon: IconKey, Href: "#new-key"}}},
	}}),
	"users": signedIn("Users", "users.html", &PageHead{Title: "Users", Actions: []Button{{Label: "New user", Icon: IconPlus, Key: "c", Primary: true, Href: "usernew.html"}}}, Nodes{
		Chips{Label: "Filter", Items: []Chip{{Href: "?state=all", Icon: IconList, Label: "all", Count: "24", On: true}, {Href: "?state=active", Icon: IconOk, Label: "active", Count: "21"},
			{Href: "?state=pending", Icon: IconPause, Label: "pending", Count: "2"}, {Href: "?state=disabled", Icon: IconArchive, Label: "disabled", Count: "1"}}},
		Table{Columns: []Column{{Label: "User", Href: "?sort=user", Sort: "ascending"}, {Label: "State"}, {Label: "Roles"}, {Label: "Last sign-in", Href: "?sort=last"}},
			Rows: [][]Node{
				{Link{Href: "user.html", Label: "Peter Spiess"}, Status{State: OK, Label: "TOTP"}, Plain("Administrator"), Plain("active now")},
				{Link{Href: "user.html", Label: "Anna Berger"}, Status{State: OK, Label: "TOTP"}, Plain("Accounting"), Plain("26.11.2026 17:40")},
				{Link{Href: "user.html", Label: "Jo Lind"}, Status{State: Warn, Label: "pending"}, Plain("Developer"), Plain("never")},
				{Link{Href: "user.html", Label: "deploy-bot"}, Status{State: Info, Label: "service user"}, Plain("none"), Plain("key used 27.11.2026")},
				{Link{Href: "user.html", Label: "Max Weber"}, Status{State: Disabled, Label: "disabled"}, Plain("none"), Plain("03.02.2026")},
			}},
		Pager{Position: "1–5 of 24", Next: "?page=2", Pages: []PageLink{{Href: "?page=1", Label: "1", On: true}, {Href: "?page=2", Label: "2"}, {Href: "?page=3", Label: "3"}}},
	}),
	"user": signedIn("Anna Berger", "users.html", &PageHead{
		Crumbs: Breadcrumbs{{Href: "users.html", Icon: IconUsers, Label: "Users"}, {Label: "Anna Berger"}},
		Title:  "Anna Berger", State: &Status{State: OK, Label: "active"},
		Actions: []Button{{Label: "Send reset link", Icon: IconMail, PhoneIcon: true}, {Label: "Disable", Icon: IconLock, Danger: true}},
		More:    []MenuItem{{Icon: IconRefresh, Label: "Reset TOTP"}, {Icon: IconPower, Label: "Sign out everywhere"}, {Icon: IconTrash, Label: "Delete", Danger: true, Line: true}},
	}, Nodes{
		InfoGrid{{Label: "User id", Value: ObjectID("USR-0007")}, {Label: "Username", Value: Code("anna@acme.example")}, {Label: "Seen", Value: Plain("26.11.2026 17:40")}},
		Settings{Action: "/admin/users/USR-0007", Sections: []SettingsSection{
			{Title: "Account", Rows: []Setting{
				{Label: "Name", Value: Editable{Label: "Name", Name: "name", Value: "Anna Berger"}},
				{Label: "E-mail", Value: Editable{Label: "E-mail", Name: "email", Value: "anna@acme.example", Type: "email", Error: "Not an e-mail address, e.g. anna@example.org."}},
				{Label: "E-mail language", Value: Segmented{Name: "lang", Label: "E-mail language", Options: []Option{{Value: "en", Label: "English"}, {Value: "de", Label: "Deutsch", Checked: true}}}},
			}},
			{Title: "Groups", Text: "Effective groups · 3", Rows: []Setting{
				{Label: "Role", Value: Plain("Accounting")},
				{Label: "Own groups", Value: Nodes{Tag{Href: "users.html?group=bill-company-acme-editor", Label: "bill-company-acme-editor", Color: "#0891b2"}, Tag{Href: "users.html?group=tax-company-acme-viewer", Label: "tax-company-acme-viewer", Color: "#ca8a04"}}},
				{Label: "Can open", Value: Plain("bill, tax · not: track, Grafana")},
			}},
		}},
	}),
	"usernew": signedIn("New user", "users.html", &PageHead{Crumbs: Breadcrumbs{{Href: "users.html", Icon: IconUsers, Label: "Users"}, {Label: "New user"}}, Title: "New user"},
		Form{Action: "/admin/users/new", Fields: []Node{
			Field{Name: "email", Label: "E-mail", Type: Email, Required: true, Placeholder: "anna@example.org", Hint: "becomes the fixed username; the address can be changed later"},
			Field{Name: "name", Label: "Name", Placeholder: "Anna Berger"},
			Radios{Name: "role", Label: "Role", Options: []Option{{Value: "accounting", Label: "Accounting", Checked: true}, {Value: "developer", Label: "Developer"}, {Value: "", Label: "No role"}}},
		}, Actions: []Button{{Label: "Create and send activation", Icon: IconSend, Primary: true}, {Label: "Cancel", Icon: IconX, Href: "users.html"}}}),
	"roles": signedIn("Roles", "roles.html", &PageHead{Title: "Roles", Actions: []Button{{Label: "New role", Icon: IconPlus, Key: "c", Primary: true, Href: "role.html"}}},
		Table{Columns: []Column{{Label: "Role"}, {Label: "Groups"}, {Label: "Managers"}, {Label: "Users", Number: true}}, Rows: [][]Node{
			{Link{Href: "role.html", Label: "Administrator"}, Plain("auth-admin, bill-admin, grafana-admin"), Plain("admins only"), Plain("2")},
			{Link{Href: "role.html", Label: "Accounting"}, Plain("bill-company-acme-editor, tax-company-acme-viewer"), Plain("bill-admin"), Plain("5")},
			{Link{Href: "role.html", Label: "Developer"}, Plain("access-forgejo, access-grafana, track-project-website-member"), Plain("forgejo-admin"), Plain("9")},
		}}),
	"role": signedIn("Accounting", "roles.html", &PageHead{Crumbs: Breadcrumbs{{Href: "roles.html", Icon: IconKey, Label: "Roles"}, {Label: "Accounting"}}, Title: "Accounting",
		Actions: []Button{{Label: "Delete", Icon: IconTrash, Danger: true}}}, Nodes{
		Settings{Action: "/admin/roles/accounting", Sections: []SettingsSection{
			{Title: "Role", Rows: []Setting{
				{Label: "Name", Value: Editable{Label: "Name", Name: "name", Value: "Accounting"}},
				{Label: "Id", Value: Code("accounting")},
				{Label: "Groups", Value: Nodes{Tag{Href: "#", Label: "bill-company-acme-editor", Color: "#0891b2"}, Tag{Href: "#", Label: "tax-company-acme-viewer", Color: "#ca8a04"}}},
				{Label: "Managers", Value: Plain("bill-admin")},
			}, Text: "Members of the managers' groups may assign this role to existing users."},
		}},
		Card{Title: "5 users have this role", Body: []Node{Rows{{Href: "user.html", Label: "Anna Berger", Meta: "anna@acme.example"}, {Href: "user.html", Label: "Lea Huber", Meta: "lea@acme.example"}}}},
	}),
	"history": signedIn("History", "history.html", nil, Nodes{
		Chips{Label: "Apps", Items: []Chip{{Href: "?app=", Icon: IconList, Label: "all apps", On: true}, {Href: "?app=bill", Icon: IconFile, Label: "bill"}, {Href: "?app=auth", Icon: IconLock, Label: "auth"}}},
		Table{Columns: []Column{{Label: "When"}, {Label: "Who"}, {Label: "What"}, {Label: "Details"}}, Rows: [][]Node{
			{Plain("27.11.2026 08:12"), Link{Href: "user.html", Label: "peter"}, Status{State: OK, Label: "sign-in"}, Plain("bill · 192.0.2.10")},
			{Plain("26.11.2026 17:41"), Link{Href: "user.html", Label: "anna"}, Status{State: Danger, Label: "sign-in failed"}, Plain("wrong password · 198.51.100.7")},
			{Plain("26.11.2026 09:03"), Link{Href: "user.html", Label: "peter"}, Status{State: Info, Label: "role changed"}, Plain("Jo Lind: Developer")},
		}},
	}),
}
