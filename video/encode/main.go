// encode turns the recorder's frames into an animated GIF with the standard library (no ffmpeg on every machine):
//
//	go run ./video/encode <frames dir> video/demo.gif
//
// Frames are <n>-<ms>.jpg; each lasts until the next. At most 15 frames a second; smaller frames (a phone) sit centred on
// the canvas; colours map to a fixed palette (grays for text, a colour cube for the rest); each frame stores only the
// rectangle that changed.
package main

import (
	"fmt"
	"image"
	"image/color"
	"image/draw"
	"image/gif"
	"image/jpeg"
	"os"
	"path/filepath"
	"slices"
	"strconv"
	"strings"
)

const w, h, minGap = 1280, 720, 66 // canvas, ms between kept frames

func main() {
	if len(os.Args) != 3 {
		fmt.Fprintln(os.Stderr, "usage: encode <frames dir> <out.gif>")
		os.Exit(2)
	}
	files, _ := filepath.Glob(filepath.Join(os.Args[1], "*.jpg"))
	slices.Sort(files)
	type frame struct {
		path string
		ms   int
	}
	var keep []frame
	for i, f := range files {
		ms, _ := strconv.Atoi(strings.TrimSuffix(strings.SplitN(filepath.Base(f), "-", 2)[1], ".jpg"))
		if len(keep) == 0 || ms-keep[len(keep)-1].ms >= minGap || i == len(files)-1 {
			keep = append(keep, frame{f, ms})
		}
	}
	pal := palette()
	cache := map[color.RGBA]uint8{}
	var prev *image.Paletted
	out := &gif.GIF{Config: image.Config{ColorModel: pal, Width: w, Height: h}}
	for i, f := range keep {
		delay := 300 // the last frame: 3 s
		if i+1 < len(keep) {
			delay = keep[i+1].ms - f.ms
		}
		cur := image.NewPaletted(image.Rect(0, 0, w, h), pal)
		src := load(f.path)
		off := image.Pt((w-src.Bounds().Dx())/2, (h-src.Bounds().Dy())/2)
		bg := uint8(pal.Index(color.RGBA{0xe5, 0xe5, 0xe4, 0xff}))
		for p := range cur.Pix {
			cur.Pix[p] = bg
		}
		b := src.Bounds()
		for y := b.Min.Y; y < b.Max.Y && y-b.Min.Y+off.Y < h; y++ {
			for x := b.Min.X; x < b.Max.X && x-b.Min.X+off.X < w; x++ {
				r, g, bl, _ := src.At(x, y).RGBA()
				c := color.RGBA{uint8(r >> 8), uint8(g >> 8), uint8(bl >> 8), 0xff}
				idx, ok := cache[c]
				if !ok {
					idx = uint8(pal.Index(c))
					cache[c] = idx
				}
				cur.Pix[(y-b.Min.Y+off.Y)*cur.Stride+x-b.Min.X+off.X] = idx
			}
		}
		rect := cur.Bounds()
		if prev != nil {
			rect = changed(prev, cur)
			if rect.Empty() { // nothing moved: the previous frame lasts longer
				out.Delay[len(out.Delay)-1] += max(1, delay/10)
				continue
			}
		}
		sub := image.NewPaletted(rect, pal)
		draw.Draw(sub, rect, cur, rect.Min, draw.Src)
		out.Image = append(out.Image, sub)
		out.Delay = append(out.Delay, max(2, delay/10))
		out.Disposal = append(out.Disposal, gif.DisposalNone)
		prev = cur
	}
	o, err := os.Create(os.Args[2])
	if err == nil {
		err = gif.EncodeAll(o, out)
		o.Close()
	}
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	fmt.Printf("%d of %d frames → %s\n", len(out.Image), len(files), os.Args[2])
}

func load(p string) image.Image {
	f, err := os.Open(p)
	if err != nil {
		panic(err)
	}
	defer f.Close()
	img, err := jpeg.Decode(f)
	if err != nil {
		panic(err)
	}
	return img
}

// palette: 40 grays (text, lines, surfaces) and a 6×6×6 colour cube.
func palette() color.Palette {
	var p color.Palette
	for i := range 40 {
		v := uint8(i * 255 / 39)
		p = append(p, color.RGBA{v, v, v, 0xff})
	}
	for r := range 6 {
		for g := range 6 {
			for b := range 6 {
				p = append(p, color.RGBA{uint8(r * 51), uint8(g * 51), uint8(b * 51), 0xff})
			}
		}
	}
	return p
}

// changed: the smallest rectangle that holds every pixel that differs.
func changed(a, b *image.Paletted) image.Rectangle {
	r := image.Rectangle{}
	for y := range h {
		row := y * a.Stride
		for x := range w {
			if a.Pix[row+x] != b.Pix[row+x] {
				r = r.Union(image.Rect(x, y, x+1, y+1))
			}
		}
	}
	return r
}
