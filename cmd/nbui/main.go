// nbui copies nobloat/ui into an app, unchanged: the Go package (package ui) with its tokens, parts and icons.
//
//	go -C ../ui run ./cmd/nbui copy -to ../bill/ui          # write the copy (replaces an earlier one)
//	go -C ../ui run ./cmd/nbui copy -to ../bill/ui -check   # fail if the copy differs
//	go run ./cmd/nbui gen                                    # in ui: regenerate pages, fragments, samples, typedefs
//
// The app imports it as <its module>/ui; its CSS and JS come from ui.WriteAssets in the app's test.
package main

import (
	"bytes"
	"flag"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"slices"
	"strings"

	"github.com/nobloat/ui/showcase"
)

func main() {
	if len(os.Args) == 2 && os.Args[1] == "gen" {
		stale, err := showcase.Generate(".", true)
		if err != nil {
			fmt.Fprintln(os.Stderr, "nbui:", err)
			os.Exit(1)
		}
		for _, f := range stale {
			fmt.Println("wrote", f)
		}
		return
	}
	if len(os.Args) < 2 || os.Args[1] != "copy" {
		fmt.Fprintln(os.Stderr, "usage: nbui gen | nbui copy -to <app>/ui [-check]")
		os.Exit(2)
	}
	flags := flag.NewFlagSet("copy", flag.ExitOnError)
	to := flags.String("to", "", "the app's ui directory")
	check := flags.Bool("check", false, "fail if the copy differs, change nothing")
	flags.Parse(os.Args[2:])
	if *to == "" {
		flags.Usage()
		os.Exit(2)
	}
	want, err := source(".")
	if err == nil {
		if *check {
			err = compare(want, *to)
		} else {
			err = write(want, *to)
		}
	}
	if err != nil {
		fmt.Fprintln(os.Stderr, "nbui:", err)
		os.Exit(1)
	}
}

// source: the package's Go files (no tests), icons.css and every file under the level folders.
func source(root string) (map[string][]byte, error) {
	out := map[string][]byte{}
	gos, _ := filepath.Glob(filepath.Join(root, "*.go"))
	for _, f := range gos {
		if !strings.HasSuffix(f, "_test.go") {
			out[filepath.Base(f)] = nil
		}
	}
	out["icons.css"] = nil
	for _, dir := range []string{"token", "components", "blocks", "shell"} {
		filepath.WalkDir(filepath.Join(root, dir), func(p string, d fs.DirEntry, err error) error {
			if err == nil && !d.IsDir() {
				rel, _ := filepath.Rel(root, p)
				out[filepath.ToSlash(rel)] = nil
			}
			return nil
		})
	}
	for name := range out {
		b, err := os.ReadFile(filepath.Join(root, name))
		if err != nil {
			return nil, err
		}
		out[name] = b
	}
	return out, nil
}

func existing(dir string) map[string][]byte {
	got := map[string][]byte{}
	filepath.WalkDir(dir, func(p string, d fs.DirEntry, err error) error {
		if err == nil && !d.IsDir() {
			rel, _ := filepath.Rel(dir, p)
			got[filepath.ToSlash(rel)], _ = os.ReadFile(p)
		}
		return nil
	})
	return got
}

func compare(want map[string][]byte, dir string) error {
	got := existing(dir)
	var diff []string
	for name, b := range want {
		if g, ok := got[name]; !ok || !bytes.Equal(g, b) {
			diff = append(diff, name)
		}
	}
	for name := range got {
		if _, ok := want[name]; !ok {
			diff = append(diff, name+" (not in ui)")
		}
	}
	if len(diff) > 0 {
		slices.Sort(diff)
		return fmt.Errorf("%s differs from ui: %s; run nbui copy", dir, strings.Join(diff, ", "))
	}
	return nil
}

// write replaces dir with the copy; it only removes a directory that is empty or an earlier copy (has node.go).
func write(want map[string][]byte, dir string) error {
	if got := existing(dir); len(got) > 0 && got["node.go"] == nil {
		return fmt.Errorf("%s is not a copy of ui (no node.go); refusing to replace it", dir)
	}
	if err := os.RemoveAll(dir); err != nil {
		return err
	}
	for name, b := range want {
		p := filepath.Join(dir, filepath.FromSlash(name))
		if err := os.MkdirAll(filepath.Dir(p), 0o755); err != nil {
			return err
		}
		if err := os.WriteFile(p, b, 0o644); err != nil {
			return err
		}
	}
	return nil
}
