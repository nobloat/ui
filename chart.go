package ui

// Minimal charts as server-rendered SVG: copy this file into the app (change the package name) and register
// Spark and Columns as template funcs. Colors come from ui.css (grey for context, --accent for the current
// period), so charts follow design, brand and theme. ui.js adds the tooltip; the table view keeps every value
// reachable without hover. Two forms only, on purpose: a sparkline for stat tiles and columns for a trend.
// Ranked parts are CSS bars (.bars), a ratio is a .meter, a split is a .stack.

import (
	"fmt"
	"html"
	"html/template"
	"math"
	"strings"
)

// Spark draws a sparkline: a faint area under a grey line, the latest step in the accent. The vertical range is at
// least 5 % of the value, so small wobbles (uptime 99.9 to 100 %) stay small instead of looking dramatic. Width follows
// the container; stroke widths do not stretch (vector-effect), so nothing looks squashed. Put a caption next to it
// ("12 months"): a sparkline without its period is unreadable.
func Spark(vals ...float64) template.HTML {
	if len(vals) < 2 {
		return ""
	}
	lo, hi := minmax(vals)
	if floor := math.Max(math.Abs(hi), math.Abs(lo)) * 0.05; hi-lo < floor {
		mid := (hi + lo) / 2
		lo, hi = mid-floor/2, mid+floor/2
	}
	const w, h = 120.0, 32.0
	pts := make([]string, len(vals))
	for i, v := range vals {
		pts[i] = fmt.Sprintf("%.1f,%.1f", float64(i)*w/float64(len(vals)-1), h-2-(v-lo)/span(lo, hi)*(h-4))
	}
	return template.HTML(fmt.Sprintf(`<svg class="spark" viewBox="0 0 %g %g" preserveAspectRatio="none" aria-hidden="true">`+
		`<path class="area" d="M0,%g L%s L%g,%g Z"/><polyline points="%s"/><polyline class="now" points="%s"/></svg>`,
		w, h, h, strings.Join(pts, " L"), w, h, strings.Join(pts[:len(pts)-1], " "), strings.Join(pts[len(pts)-2:], " ")))
}

// Columns draws one series over time: columns with 4px rounded tops on one baseline, past ones grey, the last
// one in the accent and labeled with its value; every column has a tooltip and a focus stop, and a table view
// follows. format renders a value (money, hours).
func Columns(title string, labels []string, vals []float64, format func(float64) string) template.HTML {
	if len(vals) == 0 || len(labels) != len(vals) {
		return ""
	}
	_, hi := minmax(append([]float64{0}, vals...))
	const step, bw, top, plot = 56.0, 36.0, 24.0, 120.0 // user units = CSS px: the chart is drawn at its natural size
	w := step * float64(len(vals))
	var b strings.Builder
	fmt.Fprintf(&b, `<figure class="chart"><svg viewBox="0 0 %g %g" width="%g" height="%g" role="img" aria-label="%s">`, w, top+plot+18, w, top+plot+18, html.EscapeString(title))
	fmt.Fprintf(&b, `<line class="base" x1="0" x2="%g" y1="%g" y2="%g"/>`, w, top+plot, top+plot)
	for i, v := range vals {
		x, hgt := float64(i)*step+(step-bw)/2, v/span(0, hi)*plot
		r := math.Min(4, hgt/2)
		cur := ""
		if i == len(vals)-1 {
			cur = " cur"
		}
		tip := html.EscapeString(labels[i] + " · " + format(v))
		fmt.Fprintf(&b, `<g class="col%s" tabindex="0" data-tip="%s"><title>%s</title>`, cur, tip, tip)
		if hgt > 0 { // a zero draws nothing
			fmt.Fprintf(&b, `<path d="M%.1f %.1fv%.1fq0 -%.1f %.1f -%.1fh%.1fq%.1f 0 %.1f %.1fv%.1fz"/>`, x, top+plot, -(hgt - r), r, r, r, bw-2*r, r, r, r, hgt-r)
		}
		fmt.Fprintf(&b, `<rect class="hit" x="%.1f" y="0" width="%g" height="%g"/>`, float64(i)*step, step, top+plot)
		fmt.Fprintf(&b, `<text x="%.1f" y="%g" text-anchor="middle">%s</text>`, x+bw/2, top+plot+14, html.EscapeString(labels[i]))
		if cur != "" {
			fmt.Fprintf(&b, `<text class="val" x="%.1f" y="%g" text-anchor="end">%s</text>`, x+bw, top-10, html.EscapeString(format(v)))
		}
		b.WriteString(`</g>`)
	}
	fmt.Fprintf(&b, `</svg><details><summary>%s</summary><table class="keep"><tbody>`, html.EscapeString(title))
	for i, v := range vals {
		fmt.Fprintf(&b, `<tr><td>%s</td><td class="num">%s</td></tr>`, html.EscapeString(labels[i]), html.EscapeString(format(v)))
	}
	b.WriteString(`</tbody></table></details></figure>`)
	return template.HTML(b.String())
}

func minmax(v []float64) (lo, hi float64) {
	lo, hi = v[0], v[0]
	for _, x := range v {
		lo, hi = math.Min(lo, x), math.Max(hi, x)
	}
	return
}

func span(lo, hi float64) float64 {
	if hi == lo {
		return 1
	}
	return hi - lo
}
