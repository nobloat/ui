# nobloat/ui: a library, so no build, run, package or release targets (releases: make release APP=ui in nobloat/system).
RACE := $(if $(filter 1,$(shell go env CGO_ENABLED)),-race)

.PHONY: test gen check video screenshots

test: # vet, then every test (-race where cgo is available); browser tests run in each browser that is installed
	go vet ./...
	go test $(RACE) ./...

gen: # the specimens, fragments, HTML data, typedefs, sample and auth screens, components.js
	go run ./cmd/nbui gen

check: # layout and accessibility of every page in Chrome and Firefox; ARGS="-pages ui:blocks -browsers firefox"
	go run ./cmd/nbui check $(ARGS)

video: # records the demo in headless Chrome and writes video/demo.png (an animated PNG)
	go run ./video video/demo.png

screenshots: # the old gallery's screenshots (Chrome)
	./screenshots.sh
