from datetime import datetime

import pytest

from app.database import current_quarter_dates


@pytest.mark.parametrize(
    ('date', 'quarter', 'start', 'end'),
    [
        (datetime(2026, 1, 15), 1, datetime(2026, 1, 1), datetime(2026, 3, 31)),
        (datetime(2026, 4, 15), 2, datetime(2026, 4, 1), datetime(2026, 6, 30)),
        (datetime(2026, 7, 15), 3, datetime(2026, 7, 1), datetime(2026, 9, 30)),
        (datetime(2026, 10, 15), 4, datetime(2026, 10, 1), datetime(2026, 12, 31)),
    ],
)
def test_current_quarter_dates(date, quarter, start, end):
    assert current_quarter_dates(date) == (quarter, start, end)


def test_q4_end_date_crosses_year_boundary():
    quarter, start, end = current_quarter_dates(datetime(2026, 12, 31, 23, 59))

    assert quarter == 4
    assert start == datetime(2026, 10, 1)
    assert end == datetime(2026, 12, 31)
