import copy

import pytest
from fastapi.testclient import TestClient

from src.app import app, activities


@pytest.fixture(autouse=True)
def client_and_restore():
    """Provide a TestClient and restore the in-memory activities after each test."""
    snapshot = copy.deepcopy(activities)
    with TestClient(app) as c:
        yield c
    # restore
    activities.clear()
    activities.update(snapshot)


def test_get_activities(client_and_restore):
    client = client_and_restore
    r = client.get("/activities")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, dict)
    # ensure a known activity exists
    assert "Chess Club" in data


def test_signup_and_duplicate(client_and_restore):
    client = client_and_restore
    email = "testuser@example.com"
    activity = "Chess Club"

    # sign up
    r = client.post(f"/activities/{activity}/signup?email={email}")
    assert r.status_code == 200
    assert email in activities[activity]["participants"]

    # duplicate signup should fail
    r2 = client.post(f"/activities/{activity}/signup?email={email}")
    assert r2.status_code == 400


def test_unregister_flow(client_and_restore):
    client = client_and_restore
    email = "to-remove@example.com"
    activity = "Programming Class"

    # ensure signup works
    r = client.post(f"/activities/{activity}/signup?email={email}")
    assert r.status_code == 200
    assert email in activities[activity]["participants"]

    # unregister
    r = client.delete(f"/activities/{activity}/participants?email={email}")
    assert r.status_code == 200
    assert email not in activities[activity]["participants"]

    # unregister again should return 404
    r2 = client.delete(f"/activities/{activity}/participants?email={email}")
    assert r2.status_code == 404


def test_unregister_nonexistent_activity(client_and_restore):
    client = client_and_restore
    r = client.delete("/activities/NoSuchActivity/participants?email=foo@example.com")
    assert r.status_code == 404
