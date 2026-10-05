"""Original SAFI procedural score and sound effects. No samples or third-party recordings.
Run python3 scripts/generate-safi-audio.py (requires ffmpeg). Seeded and reproducible.
"""
import array
import math
import pathlib
import random
import subprocess
import tempfile
import wave

RATE = 22050
OUT = pathlib.Path(__file__).resolve().parents[1] / 'assets/games/safi/audio'
OUT.mkdir(parents=True, exist_ok=True)
rng = random.Random(4815)


def render(name, seconds, sample, loop=False):
    pcm = array.array('h')
    for i in range(int(seconds * RATE)):
        t = i / RATE
        fade = 1 if loop else min(1, t * 180, max(0, seconds - t) * 40)
        pcm.append(int(math.tanh(sample(t)) * fade * 28000))
    with tempfile.NamedTemporaryFile(suffix='.wav') as f:
        with wave.open(f.name, 'wb') as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(RATE)
            w.writeframes(pcm.tobytes())
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', f.name, '-codec:a', 'libmp3lame', '-b:a', '96k', str(OUT / (name + '.mp3'))], check=True)


def tone(freq, t):
    return math.sin(2 * math.pi * freq * t)


def music(t, energy):
    # Four bars in A minor; evolving bass, syncopated pluck and airy offbeat hats.
    beat = t / .5
    b = beat % 1 * .5
    step = int(beat * 2)
    q = (beat * 2 % 1) * .25
    chord = [55, 65.406, 73.416, 49][int(beat / 4) % 4]
    kick = tone(52, b) * math.exp(-b * 24) + tone(105 - b * 100, b) * math.exp(-b * 55) * .35
    bass = (tone(chord, q) + .3 * tone(chord * 2, q)) * math.exp(-q * 12) * .32
    notes = [2, 3, 4, 6, 4, 3, 2, 8]
    pluck = (tone(chord * notes[step % 8], q) + .22 * tone(chord * notes[step % 8] * 2, q)) * math.exp(-q * 21) * .19
    hat = rng.uniform(-1, 1) * math.exp(-q * 95) * .11 * energy
    snare = rng.uniform(-1, 1) * math.exp(-b * 38) * .17 if int(beat) % 2 else 0
    pad = (tone(chord * 4, t) + .5 * tone(chord * 6, t)) * .035 * math.sin(math.pi * (beat % 4) / 4) ** 2
    return energy * (kick * .28 + snare) + bass + pluck + pad + hat


for name, energy in [('lobby', .35), ('round', .8), ('final', 1.05), ('result', .5)]:
    render(name, 8, lambda t, e=energy: music(t, e), loop=True)
render('crowd', 8, lambda t: rng.uniform(-.07, .07) + .018 * tone(170, t) * (1 + .5 * tone(.5, t)), loop=True)
for v in range(3):
    render(f'kick{v}', .28, lambda t, v=v: tone(95 + v * 12, t) * math.exp(-t * 30) * .65 + rng.uniform(-.2, .2) * math.exp(-t * 45))
    render(f'catch{v}', .32, lambda t, v=v: (rng.uniform(-.65, .65) + tone(170 + v * 20, t) * .4) * math.exp(-t * 23))
    render(f'break{v}', .55, lambda t: rng.uniform(-.7, .7) * math.exp(-t * 18) + .16 * tone(420 - t * 500, t) * math.exp(-t * 8))
    render(f'cluck{v}', .85, lambda t, v=v: tone(420 + v * 40 + 90 * tone(7, t), t) * math.sin(math.pi * min(1, (t % .18) / .18)) ** 3 * math.exp(-t * 3) * .27)
    render(f'frustrated{v}', .8, lambda t, v=v: (tone(260 + v * 23 - t * 120 + 35 * tone(12, t), t) + .1 * rng.uniform(-1, 1)) * math.exp(-t * 4) * .32)
    render(f'cheer{v}', 1.8, lambda t, v=v: (rng.uniform(-.22, .22) + .13 * tone(480 + v * 35 + 70 * tone(2, t), t)) * math.sin(math.pi * t / 1.8))
render('whoosh', .48, lambda t: rng.uniform(-1, 1) * math.sin(math.pi * t / .48) ** 3 * .16)
render('near', .65, lambda t: tone(330 - t * 100, t) * math.sin(math.pi * t / .65) ** 2 * .18 + rng.uniform(-.09, .09))
render('critical', .45, lambda t: (tone(105, t) * .65 + rng.uniform(-.55, .55)) * math.exp(-t * 18))
render('landing', .4, lambda t: (tone(64, t) * .5 + rng.uniform(-.22, .22)) * math.exp(-t * 20))
render('slide', .5, lambda t: rng.uniform(-.2, .2) * math.exp(-t * 5))
render('ui', .12, lambda t: tone(880, t) * math.exp(-t * 45) * .24)
for name, notes in [('reward', [523, 659, 784, 1046]), ('achievement', [392, 523, 659]), ('combo', [659, 784]), ('hot', [784, 988, 1175])]:
    length = len(notes) * .13 + .4
    render(name, length, lambda t, ns=notes: sum(tone(f, t - i * .13) * math.exp(-(t - i * .13) * 7) * .25 for i, f in enumerate(ns) if t >= i * .13))
print(f'Generated {len(list(OUT.glob("*.mp3")))} original SAFI assets.')
