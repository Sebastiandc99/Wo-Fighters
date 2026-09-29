# Gabriel — integration and art

Based on the user's supplied Gabriel poster. Artwork generated with the built-in image generation tool, then packed with the existing atlas script using nearest-neighbor scaling and lossless WebP. No existing character artwork was replaced.

Assets: `assets/gabriel-atlas-v1.webp` (16 poses, 4×4 cells of 270px) and `assets/gabriel-portrait-v1.webp`. The two SVG badges represent the code-rendered schedule attacks.

Camino Crítico uses Jairo's existing `spawnSchedule`, `updateSchedule`, `drawSchedule` and `critical` sound cue from KP Fighters, with Gabriel's requested damage23, cost30, recovery0.56s and range608. Startup0.22s, active0.05s, sustained line, block behavior and sound are shared. A jump avoids the line while above it but landing into the sustained line can still hit, as in Jairo's original attack.

Gantt Impacto uses the original `crash` MP3 unchanged, synchronized with four projected bars (6+6+8+14 =34 raw damage). It costs100, has range684 and uses the existing cinematic control lock, pause lifecycle and final knockdown. Health damage is normalized with the same resistance and damage scale as the rest of Wo Fighters.

Gabriel is 1.72m (relative render size249), between Peluche (204) and Linares (254), with resistance94, agility7, normalDamage8 and melee reach5/10. The specified0.56s recovery is for the common power; melee retains normal agility timing.

## Final generation prompts

### Atlas
Use case: stylized-concept. Production videogame sprite sheet, transparent background. Use the attached poster ONLY as Gabriel character identity reference. Create exactly sixteen separate full-body sprites in a strict 4 columns x 4 rows evenly spaced grid, no text, no effects, no props outside silhouette, no ground, no panels. Consistent 16-bit arcade pixel art with crisp chunky pixels and dark outline. Same slim adult man in every cell: warm medium-light brown skin, short upswept dark hair, black rectangular glasses, small chin goatee, black over-ear headset, yellow work shirt with navy collar and sleeve cuffs, silver reflective waist stripe, navy work trousers with reflective lower-leg bands, dark safety boots. No hat. Facing RIGHT in every pose. Exact row-major order: row1 ready fighting stance, extended straight punch, high side kick, recoiling from hit; row2 reaching one hand forward palm open preparing power, low sweeping kick, walking stride A, walking stride B; row3 crouching guard, jumping knees bent, airborne extended kick, rising uppercut; row4 forward high volley kick, falling knocked down horizontally, fully extended open hand releasing critical path, both hands thrust forward projecting Gantt blocks. Keep figure size consistent across poses, generous transparent gutters, all limbs fully inside their individual cells. Only the characters, no projectile or diagram effects. Every sprite a single connected silhouette.

### Portrait
Use case: stylized-concept. Character selection portrait asset for 16-bit arcade fighting game. Use attached poster ONLY as Gabriel identity reference. Isolated FULL BODY Gabriel in confident fighting stance, facing slightly right with raised fists and hands open ready for planning powers. Slim adult man, warm medium-light brown skin, short upswept dark hair, black rectangular glasses, subtle chin goatee, black over-ear headset, yellow work shirt with navy collar and cuffs, reflective silver waist stripe, navy work pants with silver bands near ankles, dark safety boots. Match reference face and outfit. Crisp detailed arcade pixel art, strong dark outlines, transparent background. Entire body and boots visible with generous margin, no text, no border, no glow, no diagrams, no other people, no poster elements.

Validation: focused game-engine tests in `tests/gabriel.test.cjs`, regression tests for Wo roster, existing characters, supers, mobile controls/performance. Real Canvas renders inspected for idle, critical path and Gantt bars. Original audio SHA-256 verified against KP Fighters reference.
