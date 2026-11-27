package ui

import (
	"bytes"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"regexp"
	"slices"
	"strings"
)

// Assets renders every page an app has and returns the one ui.css and ui.js they need together: the tokens and base, the
// icons in use, then each part's CSS and JS in the order of the levels. No part list to keep: what renders is what ships.
func Assets(pages ...Node) (css, js []byte, err error) {
	all := NewCtx("en", nil)
	for _, p := range pages {
		c := NewCtx("en", nil)
		if err := p.Render(c, io.Discard); err != nil {
			return nil, nil, err
		}
		for k := range c.used {
			all.used[k] = true
		}
		for k := range c.icons {
			all.icons[k] = true
		}
	}
	css, js = assets(all)
	return css, js, nil
}

// WriteAssets is the one line in an app's test: it fails when dir/ui.css or dir/ui.js differ from what the pages need,
// and rewrites them with update (go test -update).
func WriteAssets(dir string, update bool, pages ...Node) error {
	css, js, err := Assets(pages...)
	if err != nil {
		return err
	}
	for name, want := range map[string][]byte{"ui.css": css, "ui.js": js} {
		path := filepath.Join(dir, name)
		old, _ := os.ReadFile(path)
		if bytes.Equal(old, want) {
			continue
		}
		if !update {
			return fmt.Errorf("%s is stale: run go test -update", path)
		}
		if len(want) == 0 {
			os.Remove(path)
		} else if err := os.WriteFile(path, want, 0o644); err != nil {
			return err
		}
	}
	return nil
}

var levels = []string{"components", "blocks", "shell"}

var iconRef = regexp.MustCompile(`var\(--icon-([\w-]+)\)`)

func assets(c *Ctx) (css, js []byte) {
	parts := make([]string, 0, len(c.used))
	for p := range c.used {
		parts = append(parts, p)
	}
	slices.SortFunc(parts, func(a, b string) int {
		la, lb := slices.Index(levels, a[:strings.Index(a, "/")]), slices.Index(levels, b[:strings.Index(b, "/")])
		if la != lb {
			return la - lb
		}
		return strings.Compare(a, b)
	})
	var body, script bytes.Buffer
	icons := map[string]bool{}
	for k := range c.icons {
		icons[k] = true
	}
	for _, p := range parts {
		base := p + "/" + p[strings.LastIndex(p, "/")+1:]
		if b, err := files.ReadFile(base + ".css"); err == nil {
			fmt.Fprintf(&body, "\n/* %s */\n%s", p, b)
			for _, m := range iconRef.FindAllSubmatch(b, -1) {
				icons[string(m[1])] = true
			}
		}
		if b, err := files.ReadFile(base + ".js"); err == nil {
			fmt.Fprintf(&script, "\n// %s\n%s", p, b)
		}
	}
	var out bytes.Buffer
	out.WriteString("/* nobloat/ui, generated from the app's pages by ui.Assets: do not edit */\n")
	for _, f := range []string{"token/token.css", "token/base.css"} {
		b, _ := files.ReadFile(f)
		fmt.Fprintf(&out, "\n/* %s */\n%s", f, b)
	}
	out.WriteString("\n/* icons */\n" + iconCSS(icons))
	out.Write(body.Bytes())
	if script.Len() > 0 {
		base, _ := files.ReadFile("token/base.js")
		js = fmt.Appendf(nil, "// nobloat/ui, generated from the app's pages by ui.Assets: do not edit\n\n// token/base.js\n%s%s", base, script.Bytes())
	}
	return out.Bytes(), js
}

// iconCSS takes the icon rule and the named icons from the generated icons.css.
func iconCSS(names map[string]bool) string {
	b, _ := files.ReadFile("icons.css")
	var rule, vars, classes strings.Builder
	for _, l := range strings.Split(string(b), "\n") {
		switch {
		case strings.HasPrefix(l, ":is("):
			rule.WriteString(l + "\n")
		case strings.HasPrefix(l, "  --icon-"):
			if names[l[len("  --icon-"):strings.Index(l, ":")]] {
				vars.WriteString(l + "\n")
			}
		case strings.HasPrefix(l, ".icon-"):
			if names[l[len(".icon-"):strings.Index(l, " ")]] {
				classes.WriteString(l + "\n")
			}
		}
	}
	return rule.String() + ":where(:root) {\n" + vars.String() + "}\n" + classes.String()
}

func (c *Ctx) hasJS() bool {
	for p := range c.used {
		if _, err := files.Open(p + "/" + p[strings.LastIndex(p, "/")+1:] + ".js"); err == nil {
			return true
		}
	}
	return false
}
