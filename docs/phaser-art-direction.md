# Illustrated corridor

The modern Phaser presentation uses a contemporary illustrated background, smooth procedural character artwork driven by the existing poses, and a restrained interface. The original game and original reference fixtures stay intact.

## Background asset

- File: `src/phaser/assets/corridor-illustrated-v1.png`
- Generated with the built-in image_gen tool using the original corridor as a layout reference.
- Original generated output is retained in Codex's generated_images folder; the game consumes the copy in the project.
- The illustration preserves the lift, four apartment doors, Swedish signs, wall/floor junction and clear walking area. People are rendered separately by Phaser.

## Generation prompt

```text
Use case: style-transfer.
Asset type: production background plate for an existing 2D narrative/adventure game, landscape 16:9, ideally 1536x864 or 1920x1080.
Input image 1 is the existing room layout reference. Create a fully re-illustrated contemporary hand-painted version of this Swedish apartment corridor at Kurirgatan 28D, floor eight. This is the FINAL EMPTY ENVIRONMENT BACKGROUND, not a screenshot mockup.
Style: sophisticated European graphic novel / illustrated indie adventure, crisp organically drawn contours, broad painterly colour planes, subtle plaster and brushed-metal texture, beautifully controlled warm light and cool soft shadows. Smooth high-resolution illustration, absolutely no pixel art, no 3D render, no photorealism.
Composition invariants: flat side-on orthographic wall, same room geometry and 16:9 framing. Absolutely horizontal wall/floor junction at 65% of image height. Open unobstructed walking floor occupies the entire bottom 35% of the image, no objects or people on it. Steel lift at left with centre x=11%, extending from y=23% to floor junction. Four apartment doors centred at x=31%, 49%, 67%, 85%, ending at the same floor junction; doors can be elegantly taller than in the reference, tops around y=34%. The THIRD door is deep forest green, partly open into a dark apartment; other doors muted walnut, smoky blue, and sage. Low sage-painted wainscoting from y=48% to 65%; warm ivory plaster above. Same shallow ceiling strip and three ceiling lights above. Soft pools of warm ceiling light, subtle reflected floor light, dark joints between stone/terrazzo floor tiles. The floor has depth but the back wall is straight frontal, no central vanishing-point hallway.
Preserve environmental text only: small red "8" over the lift; discreet nameplates "SAAD", "BERG", "D.D", "NILSSON" over the four doors respectively; a green "UT" exit sign high at horizontal centre. A softly painted large number "8" on the wall between lift and first apartment. Preserve lived-in residential modesty and the reference's recognisable layout.
REMOVE ALL THREE CHARACTERS AND THEIR SHADOWS. No humans, no animals, no character labels floating in the room, no foreground props, no furniture in the walking area. No UI, dialogue, icons, title, logos, watermark, frame or outer border. Edge-to-edge finished background only.
```
