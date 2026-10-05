"""Original SAFI score, ambience and sound effects. No samples or third-party recordings.
Run python3 scripts/generate-safi-audio.py (requires ffmpeg). Seeded and reproducible.

Design: a warm, modern sports score (soft pads, sub bass, gentle pluck arpeggio, a soft low pulse) instead of
drum-machine loops; a crowd bed that is a quiet, low-passed murmur rather than white noise; physical, short effects
(leather glove impact, shell crack, cloth landing) with no harsh highs. Every loop is periodic so it wraps cleanly.
"""
import array
import math
import pathlib
import random
import subprocess
import tempfile
import wave

RATE = 32000
OUT = pathlib.Path(__file__).resolve().parents[1] / 'assets/games/safi/audio'
OUT.mkdir(parents=True, exist_ok=True)
rng = random.Random(4815)
TAU = 2 * math.pi


# ——— helpers ———
def n_of(seconds):
    return int(seconds * RATE)


def lp(buf, cutoff):
    a = 1 - math.exp(-TAU * cutoff / RATE)
    y = 0.0
    out = []
    for x in buf:
        y += a * (x - y)
        out.append(y)
    return out


def hp(buf, cutoff):
    low = lp(buf, cutoff)
    return [x - l for x, l in zip(buf, low)]


def band(buf, lo, hi):
    return hp(lp(buf, hi), lo)


def noise(n, amp=1.0):
    return [rng.uniform(-amp, amp) for _ in range(n)]


def gen(seconds, fn):
    return [fn(i / RATE) for i in range(n_of(seconds))]


def mix(*bufs):
    n = max(len(b) for b in bufs)
    return [sum(b[i] if i < len(b) else 0 for b in bufs) for i in range(n)]


def gain(buf, g):
    return [x * g for x in buf]


def mult(a, b):
    return [x * y for x, y in zip(a, b)]


def sine(f, t):
    return math.sin(TAU * f * t)


def peak_normalise(bufs, target):
    peak = max(max(abs(x) for x in b) for b in bufs) or 1
    return [[x / peak * target for x in b] for b in bufs]


def write(name, channels, target=0.72, fade=True, af=None, loop_twice=False):
    """channels: list of 1 or 2 float buffers. Peak-normalised, fades the ends of one-shots, encoded to mp3."""
    channels = peak_normalise(channels, target)
    n = len(channels[0])
    if fade:
        edge_in, edge_out = min(n, 96), min(n, 640)
        for ch in channels:
            for i in range(edge_in):
                ch[i] *= i / edge_in
            for i in range(edge_out):
                ch[n - 1 - i] *= i / edge_out
    pcm = array.array('h')
    for i in range(n):
        for ch in channels:
            pcm.append(int(max(-1, min(1, ch[i])) * 32000))
    with tempfile.NamedTemporaryFile(suffix='.wav') as f:
        with wave.open(f.name, 'wb') as w:
            w.setnchannels(len(channels))
            w.setsampwidth(2)
            w.setframerate(RATE)
            w.writeframes(pcm.tobytes())
        cmd = ['ffmpeg', '-v', 'error', '-y']
        filters = af or []
        if loop_twice:
            # Render the periodic loop twice, add the echo/reverb tail, then keep the second copy: a seamless wrap.
            cmd += ['-stream_loop', '1', '-i', f.name]
            seconds = n / RATE
            filters = filters + [f'atrim=start={seconds}:end={2 * seconds}', 'asetpts=PTS-STARTPTS']
        else:
            cmd += ['-i', f.name]
        if filters:
            cmd += ['-af', ','.join(filters)]
        cmd += ['-codec:a', 'libmp3lame', '-b:a', '112k' if len(channels) == 2 else '80k', str(OUT / (name + '.mp3'))]
        subprocess.run(cmd, check=True)


def crossfade_loop(buf, seconds):
    """Make a noise bed loop without a seam: the tail fades into the head."""
    x = n_of(seconds)
    head, tail = buf[:x], buf[-x:]
    body = buf[x:-x] if len(buf) > 2 * x else []
    blend = [tail[i] * math.cos(math.pi / 2 * i / x) + head[i] * math.sin(math.pi / 2 * i / x) for i in range(x)]
    return body + blend


# ——— music ———
BPM = 100
BEAT = 60 / BPM
BAR = BEAT * 4
SEG = BAR * 2  # one chord = two bars
LOOP = SEG * 4  # eight bars

CHORDS = {
    'Am': ([110.0, 164.8, 220.0, 261.6, 329.6], 55.0),
    'F': ([87.3, 130.8, 174.6, 220.0, 261.6], 43.65),
    'C': ([130.8, 196.0, 261.6, 329.6, 392.0], 65.4),
    'G': ([98.0, 146.8, 196.0, 246.9, 293.7], 49.0),
    'Dm': ([73.4, 110.0, 146.8, 174.6, 220.0], 36.7),
    'E': ([82.4, 123.5, 164.8, 207.7, 246.9], 41.2),
}


def window(t, i):
    """Hann crossfade weight of chord i at time t (adjacent chords sum to 1, wraps round the loop)."""
    d = (t - (i + 0.5) * SEG + LOOP / 2) % LOOP - LOOP / 2
    return math.cos(math.pi / 2 * d / SEG) ** 2 if abs(d) < SEG else 0.0


def score(progression, kick, pulse, arp_div, arp_amp, pad_amp, riser=False, bells=False, bass_amp=0.2):
    chords = [CHORDS[c] for c in progression]
    n = n_of(LOOP)
    left, right = [0.0] * n, [0.0] * n
    for k in range(n):
        t = k / RATE
        weights = [window(t, i) for i in range(4)]
        ci = max(range(4), key=lambda i: weights[i])
        beat = t / BEAT
        b = (beat % 1) * BEAT
        pad_l = pad_r = 0.0
        for i, w in enumerate(weights):
            if w <= 0:
                continue
            for f in chords[i][0]:
                pad_l += w * (math.sin(TAU * f * 0.9985 * t) + 0.35 * math.sin(TAU * f * 2 * 0.9985 * t) + 0.12 * math.sin(TAU * f * 3 * t))
                pad_r += w * (math.sin(TAU * f * 1.0015 * t) + 0.35 * math.sin(TAU * f * 2 * 1.0015 * t) + 0.12 * math.sin(TAU * f * 3 * t))
        slow = 0.75 + 0.25 * math.sin(TAU * t / (LOOP / 2))
        pad_l *= pad_amp * slow
        pad_r *= pad_amp * slow
        root = chords[ci][1]
        bar_pos = (t % BAR)
        bass = (math.sin(TAU * root * t) + 0.22 * math.sin(TAU * root * 2 * t)) * math.exp(-bar_pos * 1.1) * bass_amp
        if pulse:
            eighth = (t % (BEAT / 2))
            bass += math.sin(TAU * root * 2 * t) * math.exp(-eighth * 10) * bass_amp * 0.55
        thump = 0.0
        if kick:
            on = (int(beat) % 2 == 0) if kick == 2 else True
            if on:
                thump = (math.sin(TAU * (48 + 60 * math.exp(-b * 38)) * b)) * math.exp(-b * 13) * 0.26
        arp = 0.0
        if arp_div:
            step_len = BEAT / arp_div
            q = t % step_len
            step = int(t / step_len)
            tones = chords[ci][0]
            order = [1, 2, 3, 4, 3, 2, 1, 3]
            f = tones[order[step % len(order)] % len(tones)] * 2
            ring = 3.2 if bells else 8.0
            arp = (math.sin(TAU * f * t) + 0.3 * math.sin(TAU * f * 2 * t)) * math.exp(-q * ring) * arp_amp
        lift = 0.0
        if riser:
            phase = (t % (LOOP / 2)) / (LOOP / 2)
            lift = math.sin(TAU * (196 + 196 * phase * phase) * t) * (phase ** 3) * 0.05
        left[k] = pad_l + bass + thump + arp * 0.9 + lift
        right[k] = pad_r + bass + thump + arp * 1.1 + lift
    return [lp(left, 5200), lp(right, 5200)]


MUSIC_AF = ['aecho=0.75:0.55:90|180:0.22|0.12', 'lowpass=f=7000', 'highpass=f=35', 'volume=8dB', 'alimiter=limit=0.89']
STYLES = {
    # lobby: calm focus, just pads, sub and sparse plucks
    'lobby': dict(progression=['Am', 'F', 'C', 'G'], kick=0, pulse=False, arp_div=0.5, arp_amp=0.06, pad_amp=0.055),
    # round: confident, a soft low pulse and a steady arpeggio
    'round': dict(progression=['Am', 'F', 'C', 'G'], kick=2, pulse=True, arp_div=2, arp_amp=0.07, pad_amp=0.05),
    # final: tension, four-on-the-floor thump, faster arpeggio and a slow riser
    'final': dict(progression=['Am', 'F', 'Dm', 'E'], kick=1, pulse=True, arp_div=4, arp_amp=0.06, pad_amp=0.05, riser=True),
    # result: resolved and warm, bell tones
    'result': dict(progression=['C', 'G', 'Am', 'F'], kick=0, pulse=False, arp_div=1, arp_amp=0.1, pad_amp=0.06, bells=True),
    # loss: low and sparse
    'loss': dict(progression=['Am', 'F', 'Dm', 'Am'], kick=0, pulse=False, arp_div=0.5, arp_amp=0.04, pad_amp=0.05, bass_amp=0.16),
}
for name, spec in STYLES.items():
    write(name, score(**spec), target=0.62, fade=False, af=MUSIC_AF, loop_twice=True)
    print('music', name)

# ——— ambience ———
bed = noise(n_of(14), 1.0)
bed = mix(gain(lp(bed, 520), 1.4), gain(lp(noise(n_of(14)), 1700), 0.5))
bed = hp(bed, 110)
bed = mult(bed, [0.65 + 0.35 * math.sin(TAU * 0.11 * i / RATE) * math.sin(TAU * 0.037 * i / RATE + 1) for i in range(len(bed))])
write('crowd', [crossfade_loop(bed, 1.5)], target=0.45, fade=False)


def roar(seconds, centre, flutter):
    n = n_of(seconds)
    body = mix(gain(lp(noise(n), 2200), 1.0), gain(lp(noise(n), 700), 0.9))
    body = hp(body, 260)
    wob = [1 + 0.35 * x for x in lp(noise(n), flutter)]
    wob = [max(0.2, w) for w in wob]
    shape = [math.sin(math.pi * min(1, i / (n * 0.38))) ** 2 if i < n * 0.38 else math.exp(-(i / n - 0.38) * 3.2) for i in range(n)]
    return mult(mult(body, wob), shape)


for v in range(3):
    write(f'cheer{v}', [roar(1.9 + v * 0.1, 900 + v * 120, 14 + v * 4)], target=0.55)
voice = lambda t: (sine(300 - 90 * t / .75, t) + .5 * sine(600 - 180 * t / .75, t) + .25 * sine(910, t)) * (1 + .04 * sine(5.5, t))
near = mult(gen(.8, voice), [math.sin(math.pi * i / n_of(.8)) ** 2 for i in range(n_of(.8))])
write('near', [mix(near, gain(lp(noise(n_of(.8)), 900), 0.12 * 3))], target=0.4)

# ——— gameplay effects ———
for v in range(3):
    # kick: a foot on the egg: body thump and a short, soft click
    thump = gen(.26, lambda t, v=v: sine(88 + v * 9 - 40 * t, t) * math.exp(-t * 26))
    click = mult(lp(noise(n_of(.26)), 2800), gen(.26, lambda t: math.exp(-t * 80)))
    write(f'kick{v}', [mix(gain(thump, 0.9), gain(click, 0.35))], target=0.7)
    # glove: leather slap + a low body thump; each variant a little different
    slap = mult(band(noise(n_of(.3)), 420, 2600 + v * 300), gen(.3, lambda t: math.exp(-t * 52)))
    body = gen(.3, lambda t, v=v: sine(138 + v * 14 - 38 * t, t) * math.exp(-t * 30))
    write(f'catch{v}', [mix(gain(slap, 1.0), gain(body, 0.8))], target=0.72)
    # egg break: shell crack ticks + soft wet splat
    ticks = [0.0] * n_of(.5)
    for _ in range(4):
        at = n_of(rng.uniform(0, .05 + v * .012))
        for j in range(n_of(.012)):
            if at + j < len(ticks):
                ticks[at + j] += rng.uniform(-1, 1) * math.exp(-j / n_of(.012) * 6)
    splat = mult(lp(noise(n_of(.5)), 1100 + v * 100), gen(.5, lambda t: math.exp(-t * 11) * (1 - math.exp(-t * 90))))
    write(f'break{v}', [mix(gain(band(ticks, 1800, 5200), 0.9), gain(splat, 0.6))], target=0.62)
    cluck = gen(.6, lambda t, v=v: sine(380 + v * 35 + 60 * sine(8, t), t) * math.sin(math.pi * min(1, (t % .16) / .16)) ** 3 * math.exp(-t * 3.4))
    write(f'cluck{v}', [lp(cluck, 2600)], target=0.5)
    grunt = gen(.7, lambda t, v=v: (sine(210 + v * 20 - 70 * t + 22 * sine(11, t), t) + .1 * rng.uniform(-1, 1)) * math.exp(-t * 4.2))
    write(f'frustrated{v}', [lp(grunt, 2200)], target=0.5)
write('tip0', [mix(mult(band(noise(n_of(.2)), 1500, 4200), gen(.2, lambda t: math.exp(-t * 90))), gain(gen(.2, lambda t: sine(190, t) * math.exp(-t * 40)), 0.35))], target=0.6)
whoosh_n = n_of(.55)
air, cut = noise(whoosh_n), []
y = 0.0
for i in range(whoosh_n):
    t = i / RATE
    fc = 500 + 2600 * math.sin(math.pi * min(1, t / .55)) ** 2
    a = 1 - math.exp(-TAU * fc / RATE)
    y += a * (air[i] - y)
    cut.append(y)
write('whoosh', [mult(hp(cut, 220), gen(.55, lambda t: math.sin(math.pi * t / .55) ** 2))], target=0.5)
crit = mix(gain(gen(.55, lambda t: sine(74 - 20 * t, t) * math.exp(-t * 11)), 1.0), gain(mult(band(noise(n_of(.55)), 380, 2800), gen(.55, lambda t: math.exp(-t * 34))), 0.8))
write('critical', [crit], target=0.78)
write('landing', [mix(gen(.45, lambda t: sine(60 - 14 * t, t) * math.exp(-t * 16)), gain(mult(lp(noise(n_of(.45)), 900), gen(.45, lambda t: math.exp(-t * 22))), 0.5))], target=0.65)
write('slide', [mult(lp(noise(n_of(.7)), 820), gen(.7, lambda t: (1 - math.exp(-t * 40)) * math.exp(-t * 4.5)))], target=0.4)
write('pulse', [gen(.9, lambda t: sine(55, t) * math.sin(math.pi * t / .9) ** 2 * (1 + .4 * sine(1.2, t)))], target=0.5)
write('ui', [gen(.12, lambda t: sine(880, t) * math.exp(-t * 45))], target=0.4)
for name, notes in [('reward', [523, 659, 784, 1046]), ('achievement', [392, 523, 659]), ('combo', [659, 784]), ('hot', [784, 988, 1175])]:
    length = len(notes) * .13 + .5
    write(name, [lp(gen(length, lambda t, ns=notes: sum(sine(f, t - i * .13) * math.exp(-(t - i * .13) * 6) * .25 for i, f in enumerate(ns) if t >= i * .13)), 4800)], target=0.55)
print(f'Generated {len(list(OUT.glob("*.mp3")))} original SAFI assets.')
