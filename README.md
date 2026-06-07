# Fluid Sandbox · WebGL2

An interactive, GPU-accelerated fluid simulation sandbox. Inject and push
liquids around, carve walls, and switch between presets that differ in viscosity
and albedo. The goal is visual beauty and flow, not physical accuracy.

Empty space behaves like **air**: it doesn't dissolve the liquid you apply.
Gravity is on by default, so liquid falls and pools, and the area's edges start
out as **walls** you can punch through with the eraser.

## Commands

```bash
npm install      # install build dependencies
npm run dev      # dev server with HMR
npm run build    # type-check + emit dist/index.html (the final artifact)
npm run preview  # serve the production build
```

`dist/index.html` is fully self-contained: open it straight in a browser or
share it, no server needed.

## Source layout (`src/`)

| Module          | Responsibility                                             |
| --------------- | ---------------------------------------------------------- |
| `gl-utils.ts`   | WebGL2 context, extensions, programs, FBO/DoubleFBO, blit. |
| `shaders.ts`    | All fragment shaders (GLSL ES 3.00).                       |
| `presets.ts`    | Per-fluid parameters and color.                            |
| `config.ts`     | Runtime config and preset application.                     |
| `simulation.ts` | The per-frame Stable Fluids pipeline.                      |
| `input.ts`      | Unified pointers (mouse + touch).                          |
| `ui.ts`         | Control panel and bindings.                                |
| `main.ts`       | Main loop, resize, adaptive resolution, init.              |

## Features

- 8 presets (Water, Oil, Honey, Ink, Smoke, Mercury, Lava, Plasma).
- Fluid, wall, and eraser tools (mouse and touch).
- Gravity-driven flow: liquids sink and pool, air rises; smoke and gases float up.
- Border walls by default; draw new obstacles or erase pieces of any wall.
- Walls respected by the solver (advection, Neumann pressure, free-slip).
- Adjustable vorticity confinement, viscosity, dissipation, and buoyancy.
- Rendering with fake lighting, specular, emission, bloom, ACES tonemap, vignette.
- Low-res simulation + high-res dye; resolution adapts to FPS.

## Requirements

A browser with WebGL2 and the `EXT_color_buffer_float` extension (universal on
modern desktop and mobile browsers).
