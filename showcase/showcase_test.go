package showcase

import (
	"flag"
	"testing"
)

var update = flag.Bool("update", false, "rewrite the generated files")

// TestGenerated: the design system pages, fragments, samples, bundle, components.js, typedefs and HTML data match the Go
// values; stale output fails, -update (or nbui gen) rewrites it.
func TestGenerated(t *testing.T) {
	stale, err := Generate("..", *update)
	if err != nil {
		t.Fatal(err)
	}
	if !*update && len(stale) > 0 {
		t.Errorf("stale, run nbui gen (go test ./showcase -update): %v", stale)
	}
}
