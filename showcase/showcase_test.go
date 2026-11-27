package showcase

import (
	"bytes"
	"flag"
	"os"
	"path/filepath"
	"testing"

	"github.com/nobloat/ui"
)

var update = flag.Bool("update", false, "rewrite sample/")

// TestSample renders every page to sample/ and its bundle next to it; stale output fails, -update rewrites.
func TestSample(t *testing.T) {
	var pages []ui.Node
	for name, p := range Pages {
		pages = append(pages, p)
		var b bytes.Buffer
		if err := ui.Render(&b, "en", nil, p); err != nil {
			t.Fatalf("%s: %v", name, err)
		}
		path := filepath.Join("sample", name+".html")
		if old, _ := os.ReadFile(path); bytes.Equal(old, b.Bytes()) {
			continue
		}
		if !*update {
			t.Errorf("%s is stale: run go test -update", path)
		} else if err := os.WriteFile(path, b.Bytes(), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	if err := ui.WriteAssets("sample", *update, pages...); err != nil {
		t.Error(err)
	}
}
