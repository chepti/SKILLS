"""Plan meeting dates for a Pisga course, and do the academic-hour arithmetic.

Two jobs, because both are easy to get subtly wrong by hand:

  schedule  — lay out N meetings at a fixed interval and flag every date that
              collides with a Jewish holiday or school break, or falls on a
              weekend. Israeli school holidays move against the Gregorian
              calendar every year, so eyeballing "November looks fine" is not
              a check. A flagged date is not automatically wrong (ט"ו בשבט is a
              school day); read the flag and decide.

  hours     — convert academic hours to a clock window. A Pisga academic hour is
              45 minutes, plus a 15-minute break after every 90 minutes of
              content, so 3 academic hours is 2.5 clock hours, not 2.25.

Requires pyluach for the holiday check:  pip install pyluach
Without it, `schedule` still prints dates and weekdays but cannot flag holidays,
and says so loudly.

Usage:
    python plan_dates.py schedule --start 2026-11-02 --count 10 --every 14
    python plan_dates.py hours --academic 3 --start 16:30
    python plan_dates.py hours --table
"""

import argparse
import datetime
import io
import sys

HEB_WEEKDAY = {0: "שני", 1: "שלישי", 2: "רביעי", 3: "חמישי", 4: "שישי", 5: "שבת", 6: "ראשון"}
WEEKDAY_ARG = {"sun": 6, "mon": 0, "tue": 1, "wed": 2, "thu": 3, "fri": 4, "sat": 5}

# pyluach month numbers: Tishrei=7 .. Elul=6; in a leap year 12=Adar I, 13=Adar II.
HEB_MONTH = {7: "תשרי", 8: "חשוון", 9: "כסלו", 10: "טבת", 11: "שבט",
             12: "אדר א'", 13: "אדר ב'", 1: "ניסן", 2: "אייר", 3: "סיוון",
             4: "תמוז", 5: "אב", 6: "אלול"}

# (month, day_from, day_to, label, blocking?)  — blocking means schools are out
# or the day is unusable for an afternoon/evening session.
FIXED = [
    (7, 1, 2, "ראש השנה", True),
    (7, 3, 3, "צום גדליה", False),
    (7, 9, 10, "ערב יום כיפור / יום כיפור", True),
    (7, 14, 23, "סוכות ושמחת תורה", True),
    (9, 25, 30, "חנוכה", True),
    (10, 1, 3, "חנוכה (המשך)", True),
    (11, 15, 15, "ט\"ו בשבט", False),
    (1, 1, 1, "ראש חודש ניסן", False),
    (1, 10, 22, "חופשת פסח", True),
    # The eve matters as much as the day for an afternoon/evening session: the
    # national ceremony is that evening, and schools run memorial activities.
    (1, 26, 26, "ערב יום הזיכרון לשואה ולגבורה", True),
    (1, 27, 27, "יום הזיכרון לשואה ולגבורה", True),
    (2, 2, 6, "ערב יום הזיכרון / יום הזיכרון ויום העצמאות (המועד זז לפי היום בשבוע)", True),
    (2, 18, 18, "ל\"ג בעומר", False),
    (2, 28, 28, "יום ירושלים", False),
    (3, 5, 7, "ערב שבועות ושבועות", True),
    (4, 17, 17, "צום י\"ז בתמוז", False),
    (5, 9, 10, "תשעה באב", True),
]


def purim_window(year, is_leap):
    """Purim sits in Adar II in a leap year, Adar in a plain year."""
    month = 13 if is_leap else 12
    return [(month, 13, 13, "תענית אסתר", False),
            (month, 14, 15, "פורים ושושן פורים", True)]


def holiday_flags(g):
    try:
        from pyluach import dates
    except ImportError:
        return None, None
    h = dates.GregorianDate(g.year, g.month, g.day).to_heb()
    is_leap = 13 in {m for m in HEB_MONTH} and _is_leap(h.year)
    hits = []
    for month, d1, d2, label, blocking in FIXED + purim_window(h.year, _is_leap(h.year)):
        if h.month == month and d1 <= h.day <= d2:
            hits.append((label, blocking))
    heb = "%d %s %d" % (h.day, HEB_MONTH.get(h.month, "?"), h.year)
    return heb, hits


def _is_leap(hebrew_year):
    return (hebrew_year * 7 + 1) % 19 < 7


def cmd_schedule(a):
    start = datetime.date.fromisoformat(a.start)
    if a.weekday:
        want = WEEKDAY_ARG[a.weekday.lower()[:3]]
        shift = (want - start.weekday()) % 7
        if shift:
            start += datetime.timedelta(days=shift)
            print("note: moved start to %s to land on %s\n" % (start.isoformat(), a.weekday))

    have_pyluach = holiday_flags(start)[0] is not None
    if not have_pyluach:
        print("WARNING: pyluach is not installed, so holidays were NOT checked.")
        print("         Install it with:  pip install pyluach")
        print("         Do not tell the user the dates avoid holidays until it is.\n")

    print("%-4s %-12s %-8s %-18s %s" % ("#", "date", "weekday", "hebrew date", "flags"))
    print("-" * 88)
    problems = []
    for i in range(a.count):
        g = start + datetime.timedelta(days=a.every * i)
        heb, hits = holiday_flags(g)
        flags = []
        if g.weekday() in (4, 5):
            flags.append("!! סוף שבוע")
        for label, blocking in (hits or []):
            flags.append(("!! " if blocking else "~ ") + label)
        if flags:
            problems.append((i + 1, g, flags))
        print("%-4d %-12s %-8s %-18s %s" % (
            i + 1, g.strftime("%d/%m/%Y"), HEB_WEEKDAY[g.weekday()], heb or "-",
            "  ".join(flags)))

    print()
    if not problems:
        print("No collisions. '!!' would mean schools are out or it is a weekend;")
        print("'~' would mean a marked day that is still a normal school day.")
    else:
        print("Review these before showing the user:")
        for n, g, flags in problems:
            print("  meeting %d (%s): %s" % (n, g.strftime("%d/%m/%Y"), ", ".join(flags)))
        print()
        print("A '!!' date needs to move. Shifting the whole series by one interval,")
        print("or skipping just that slot, usually resolves it — check the knock-on dates.")


def academic_to_minutes(n):
    """45 min per academic hour, +15 min break after each 90 min of content."""
    return 45 * n + 15 * ((n - 1) // 2)


def fmt_minutes(m):
    return "%d:%02d" % (m // 60, m % 60)


def cmd_hours(a):
    if a.table:
        print("%-10s %-10s %s" % ("academic", "clock", "= content + breaks"))
        print("-" * 46)
        for n in range(1, 9):
            m = academic_to_minutes(n)
            print("%-10d %-10s %d + %d min" % (n, fmt_minutes(m), 45 * n, m - 45 * n))
        print()
        print("Formula: minutes = 45*n + 15*floor((n-1)/2)")
        return
    if a.academic is None:
        print("give --academic N, or --table")
        return
    m = academic_to_minutes(a.academic)
    print("%d academic hours = %s clock time (%d min content + %d min breaks)"
          % (a.academic, fmt_minutes(m), 45 * a.academic, m - 45 * a.academic))
    if a.start:
        h, mi = (int(x) for x in a.start.split(":"))
        end = (datetime.datetime(2000, 1, 1, h, mi) + datetime.timedelta(minutes=m)).time()
        print("%s -> %s" % (a.start, end.strftime("%H:%M")))


def main():
    # Only rebind stdout when run as a command. Doing it at import time closes the
    # caller's stream when the wrapper is garbage-collected, which makes
    # `from plan_dates import holiday_flags` unusable from another script.
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, errors="replace", encoding="utf-8")

    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)

    s = sub.add_parser("schedule", help="lay out meeting dates and flag holidays")
    s.add_argument("--start", required=True, help="first meeting, YYYY-MM-DD")
    s.add_argument("--count", type=int, required=True)
    s.add_argument("--every", type=int, default=7, help="days between meetings (14 = biweekly)")
    s.add_argument("--weekday", help="snap start to this weekday: sun/mon/tue/wed/thu")
    s.set_defaults(func=cmd_schedule)

    h = sub.add_parser("hours", help="academic hours <-> clock time")
    h.add_argument("--academic", type=int)
    h.add_argument("--start", help="start time HH:MM, to get the end time")
    h.add_argument("--table", action="store_true", help="print the full conversion table")
    h.set_defaults(func=cmd_hours)

    a = p.parse_args()
    a.func(a)


if __name__ == "__main__":
    main()
