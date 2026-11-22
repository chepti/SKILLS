"""List free (no-attribution) Mixkit music tracks with direct mp3 URLs.

usage: python find_music.py [category-path ...]
  default categories: mood/uplifting, corporate-music, tag/inspirational
  e.g.  python find_music.py tag/happy mood/calm tag/cinematic

Mixkit pages embed schema.org JSON-LD with name/genre/artist/duration/url, so
no scraping of dynamic buttons is needed. Mixkit Free License = commercial use,
no attribution. Ask the user before downloading (state file, source, size).
"""
import sys, re, json, urllib.request

cats = sys.argv[1:] or ['mood/uplifting', 'corporate-music', 'tag/inspirational']
seen = set()
pat = re.compile(r'"name":"([^"]+)","genre":"([^"]+)","byArtist":"([^"]+)","duration":"PT(\d+)M(\d+)S","url":"([^"]+\.mp3)"')
for c in cats:
    url = f'https://mixkit.co/free-stock-music/{c.strip("/")}/'
    try:
        html = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'}), timeout=30).read().decode('utf8', 'ignore')
    except Exception as e:
        print('!!', url, e)
        continue
    print(f'== {c}')
    for name, genre, artist, m, s, mp3 in pat.findall(html):
        if mp3 in seen:
            continue
        seen.add(mp3)
        name = json.loads(f'"{name}"')
        print(f'{int(m)}:{int(s):02d} | {name} | {genre} | {artist} | {mp3}')
