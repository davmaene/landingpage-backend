"""ULPGL Backend API Test Suite
Tests for auth, contents (CRUD + workflow), faculties, search, newsletter, contact, dashboard.
"""
import os
import time
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://academic-nexus-48.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = {"email": "admin@ulpgl.net", "password": "Admin@2026"}
PUBLISHER = {"email": "publisher@ulpgl.net", "password": "Publisher@2026"}


# ---------- fixtures ----------
@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def admin_token(session):
    r = session.post(f"{API}/auth/login", json=ADMIN, timeout=15)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="session")
def publisher_token(session):
    r = session.post(f"{API}/auth/login", json=PUBLISHER, timeout=15)
    assert r.status_code == 200, f"publisher login failed: {r.status_code} {r.text}"
    return r.json()["token"]


def H(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ---------- health ----------
class TestHealth:
    def test_health(self, session):
        r = session.get(f"{API}/health", timeout=10)
        assert r.status_code == 200
        assert r.json().get("status") == "healthy"


# ---------- auth ----------
class TestAuth:
    def test_login_admin(self, session):
        r = session.post(f"{API}/auth/login", json=ADMIN)
        assert r.status_code == 200
        data = r.json()
        assert "token" in data and isinstance(data["token"], str)
        assert data["user"]["email"] == ADMIN["email"]
        assert data["user"]["role"] == "super_admin"
        assert "password" not in data["user"]

    def test_login_publisher(self, session):
        r = session.post(f"{API}/auth/login", json=PUBLISHER)
        assert r.status_code == 200
        data = r.json()
        assert data["user"]["role"] == "faculty_publisher"

    def test_login_invalid(self, session):
        r = session.post(f"{API}/auth/login", json={"email": "admin@ulpgl.net", "password": "wrong"})
        assert r.status_code == 401

    def test_login_missing_fields(self, session):
        r = session.post(f"{API}/auth/login", json={"email": "x@x.com"})
        assert r.status_code == 400

    def test_me_with_token(self, session, admin_token):
        r = session.get(f"{API}/auth/me", headers=H(admin_token))
        assert r.status_code == 200
        assert r.json()["user"]["email"] == ADMIN["email"]

    def test_me_without_token(self, session):
        r = session.get(f"{API}/auth/me")
        assert r.status_code == 401


# ---------- faculties ----------
class TestFaculties:
    def test_list_faculties(self, session):
        r = session.get(f"{API}/faculties")
        assert r.status_code == 200
        items = r.json()["items"]
        assert isinstance(items, list)
        assert len(items) >= 1, "seed should create faculties"
        # Each should include filieres
        assert "filieres" in items[0]
        assert "slug" in items[0]

    def test_faculty_detail(self, session):
        r = session.get(f"{API}/faculties")
        slug = r.json()["items"][0]["slug"]
        r2 = session.get(f"{API}/faculties/{slug}")
        assert r2.status_code == 200
        assert r2.json()["item"]["slug"] == slug

    def test_faculty_not_found(self, session):
        r = session.get(f"{API}/faculties/does-not-exist-xyz")
        assert r.status_code == 404


# ---------- contents ----------
class TestContents:
    def test_list_contents_published(self, session):
        r = session.get(f"{API}/contents")
        assert r.status_code == 200
        items = r.json()["items"]
        assert isinstance(items, list)
        for it in items:
            assert it["status"] == "published"

    def test_filter_contents_by_type(self, session):
        r = session.get(f"{API}/contents", params={"type": "event"})
        assert r.status_code == 200
        for it in r.json()["items"]:
            assert it["type"] == "event"

    def test_publisher_creates_pending(self, session, publisher_token):
        payload = {
            "type": "article",
            "title": f"TEST_Article_Publisher_{int(time.time())}",
            "content": "Contenu de test publié par publisher",
            "excerpt": "Resume",
            "category": "Test",
        }
        r = session.post(f"{API}/contents", json=payload, headers=H(publisher_token))
        assert r.status_code == 201, r.text
        item = r.json()["item"]
        assert item["status"] == "pending"
        assert item["title"] == payload["title"]
        # Persistence check via admin endpoint
        return item["id"]

    def test_admin_creates_published(self, session, admin_token):
        payload = {
            "type": "article",
            "title": f"TEST_Article_Admin_{int(time.time())}",
            "content": "Contenu admin",
        }
        r = session.post(f"{API}/contents", json=payload, headers=H(admin_token))
        assert r.status_code == 201
        item = r.json()["item"]
        assert item["status"] == "published"
        assert item["publishedAt"] is not None
        # Verify it appears in public listing
        slug = item["slug"]
        r2 = session.get(f"{API}/contents/slug/{slug}")
        assert r2.status_code == 200

    def test_approve_workflow(self, session, publisher_token, admin_token):
        # Publisher creates pending
        payload = {
            "type": "activity",
            "title": f"TEST_Pending_Approve_{int(time.time())}",
            "content": "À approuver",
        }
        r = session.post(f"{API}/contents", json=payload, headers=H(publisher_token))
        assert r.status_code == 201
        cid = r.json()["item"]["id"]
        # Admin approves
        r2 = session.post(f"{API}/contents/{cid}/approve", headers=H(admin_token))
        assert r2.status_code == 200
        assert r2.json()["item"]["status"] == "published"

    def test_reject_workflow(self, session, publisher_token, admin_token):
        payload = {
            "type": "event",
            "title": f"TEST_Pending_Reject_{int(time.time())}",
            "content": "À rejeter",
        }
        r = session.post(f"{API}/contents", json=payload, headers=H(publisher_token))
        assert r.status_code == 201
        cid = r.json()["item"]["id"]
        r2 = session.post(
            f"{API}/contents/{cid}/reject",
            json={"reason": "Hors sujet"},
            headers=H(admin_token),
        )
        assert r2.status_code == 200
        body = r2.json()["item"]
        assert body["status"] == "rejected"
        assert body["rejectionReason"] == "Hors sujet"

    def test_publisher_cannot_approve(self, session, publisher_token, admin_token):
        # admin creates pending-like by creating a publisher one
        payload = {
            "type": "article",
            "title": f"TEST_Forbidden_Approve_{int(time.time())}",
            "content": "x",
        }
        r = session.post(f"{API}/contents", json=payload, headers=H(publisher_token))
        cid = r.json()["item"]["id"]
        r2 = session.post(f"{API}/contents/{cid}/approve", headers=H(publisher_token))
        assert r2.status_code == 403


# ---------- search ----------
class TestSearch:
    def test_search_basic(self, session):
        r = session.get(f"{API}/search", params={"q": "ulpgl"})
        assert r.status_code == 200
        d = r.json()
        assert "contents" in d and "faculties" in d and "filieres" in d

    def test_search_empty(self, session):
        r = session.get(f"{API}/search", params={"q": ""})
        assert r.status_code == 200
        assert r.json() == {"contents": [], "faculties": [], "filieres": []}

    def test_search_faculty_term(self, session):
        # 'sciences' should match at least the Sciences faculty from seed
        r = session.get(f"{API}/search", params={"q": "sciences"})
        assert r.status_code == 200
        assert len(r.json()["faculties"]) >= 1


# ---------- newsletter ----------
class TestNewsletter:
    def test_subscribe(self, session, admin_token):
        email = f"test_newsletter_{int(time.time())}@example.com"
        r = session.post(f"{API}/newsletter", json={"email": email})
        assert r.status_code == 200
        assert r.json()["ok"] is True
        # Verify persistence via admin
        r2 = session.get(f"{API}/newsletter", headers=H(admin_token))
        assert r2.status_code == 200
        emails = [n["email"] for n in r2.json()["items"]]
        assert email in emails

    def test_subscribe_invalid_email(self, session):
        r = session.post(f"{API}/newsletter", json={"email": "not-an-email"})
        assert r.status_code == 400

    def test_subscribe_duplicate(self, session):
        email = f"dup_{int(time.time())}@example.com"
        r1 = session.post(f"{API}/newsletter", json={"email": email})
        r2 = session.post(f"{API}/newsletter", json={"email": email})
        assert r1.status_code == 200 and r2.status_code == 200


# ---------- contact ----------
class TestContact:
    def test_contact_create(self, session, admin_token):
        payload = {
            "name": "TEST_User",
            "email": f"test_contact_{int(time.time())}@example.com",
            "subject": "Test subject",
            "message": "Test message body",
        }
        r = session.post(f"{API}/contact", json=payload)
        assert r.status_code == 201
        mid = r.json()["item"]["id"]
        # Admin retrieves
        r2 = session.get(f"{API}/contact", headers=H(admin_token))
        assert r2.status_code == 200
        ids = [m["id"] for m in r2.json()["items"]]
        assert mid in ids

    def test_contact_missing_fields(self, session):
        r = session.post(f"{API}/contact", json={"name": "x"})
        assert r.status_code == 400


# ---------- dashboard ----------
class TestDashboard:
    def test_stats_admin(self, session, admin_token):
        r = session.get(f"{API}/dashboard/stats", headers=H(admin_token))
        assert r.status_code == 200
        d = r.json()
        for k in ["total", "pending", "published", "rejected", "newsletters", "messages"]:
            assert k in d
            assert isinstance(d[k], int)

    def test_stats_publisher(self, session, publisher_token):
        r = session.get(f"{API}/dashboard/stats", headers=H(publisher_token))
        assert r.status_code == 200
        # Publisher should see 0 newsletters/messages
        assert r.json()["newsletters"] == 0
        assert r.json()["messages"] == 0

    def test_stats_unauthorized(self, session):
        r = session.get(f"{API}/dashboard/stats")
        assert r.status_code == 401


# ---------- users (admin) ----------
class TestUsers:
    def test_list_users_admin(self, session, admin_token):
        r = session.get(f"{API}/users", headers=H(admin_token))
        assert r.status_code == 200
        items = r.json()["items"]
        assert any(u["email"] == ADMIN["email"] for u in items)
        # passwords must not leak
        for u in items:
            assert "password" not in u

    def test_list_users_publisher_forbidden(self, session, publisher_token):
        r = session.get(f"{API}/users", headers=H(publisher_token))
        assert r.status_code == 403


# ---------- cloudinary (iteration 2) ----------
class TestCloudinary:
    def test_config_admin(self, session, admin_token):
        r = session.get(f"{API}/cloudinary/config", headers=H(admin_token))
        assert r.status_code == 200
        data = r.json()
        assert "configured" in data
        # Keys not yet provided
        assert data["configured"] is False

    def test_config_requires_auth(self, session):
        r = session.get(f"{API}/cloudinary/config")
        assert r.status_code == 401

    def test_signature_returns_503_when_not_configured(self, session, admin_token):
        r = session.get(f"{API}/cloudinary/signature", headers=H(admin_token))
        # Expected because Cloudinary keys not yet provided
        assert r.status_code == 503
        assert "message" in r.json()

    def test_signature_requires_auth(self, session):
        r = session.get(f"{API}/cloudinary/signature")
        assert r.status_code == 401


# ---------- user registration (iteration 2) ----------
class TestRegister:
    def _faculty_id(self, session):
        r = session.get(f"{API}/faculties")
        return r.json()["items"][0]["id"]

    def test_register_publisher_as_admin(self, session, admin_token):
        ts = int(time.time())
        email = f"TEST_pub_{ts}@example.com"
        fid = self._faculty_id(session)
        payload = {
            "name": f"TEST Publisher {ts}",
            "email": email,
            "password": "TestPub@2026",
            "role": "faculty_publisher",
            "facultyId": fid,
        }
        r = session.post(f"{API}/auth/register", json=payload, headers=H(admin_token))
        assert r.status_code == 201, r.text
        user = r.json()["user"]
        assert user["email"] == email.lower()
        assert user["role"] == "faculty_publisher"
        assert "password" not in user
        # The new user must be able to login
        r2 = session.post(f"{API}/auth/login", json={"email": email, "password": "TestPub@2026"})
        assert r2.status_code == 200
        assert r2.json()["user"]["email"] == email.lower()

    def test_register_forbidden_for_publisher(self, session, publisher_token):
        ts = int(time.time())
        payload = {
            "name": "Should Fail",
            "email": f"TEST_forbidden_{ts}@example.com",
            "password": "X@123456",
            "role": "faculty_publisher",
        }
        r = session.post(f"{API}/auth/register", json=payload, headers=H(publisher_token))
        assert r.status_code == 403

    def test_register_requires_auth(self, session):
        r = session.post(f"{API}/auth/register", json={"name": "x", "email": "x@x.com", "password": "x"})
        assert r.status_code == 401

    def test_register_duplicate_email(self, session, admin_token):
        ts = int(time.time())
        email = f"TEST_dup_{ts}@example.com"
        fid = self._faculty_id(session)
        payload = {
            "name": "Dup",
            "email": email,
            "password": "Dup@12345",
            "role": "faculty_publisher",
            "facultyId": fid,
        }
        r1 = session.post(f"{API}/auth/register", json=payload, headers=H(admin_token))
        assert r1.status_code == 201
        r2 = session.post(f"{API}/auth/register", json=payload, headers=H(admin_token))
        assert r2.status_code == 409

    def test_register_missing_fields(self, session, admin_token):
        r = session.post(f"{API}/auth/register", json={"email": "x@x.com"}, headers=H(admin_token))
        assert r.status_code == 400


# ---------- Iteration 3: forgot/reset password ----------
class TestPasswordReset:
    def test_forgot_password_valid_email_returns_devlink(self, session):
        r = session.post(f"{API}/auth/forgot-password", json={"email": ADMIN["email"]})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("ok") is True
        # SendGrid skipped -> devLink should be present
        assert "devLink" in data and "/reset-password?token=" in data["devLink"]

    def test_forgot_password_unknown_email_no_leak(self, session):
        r = session.post(f"{API}/auth/forgot-password", json={"email": f"nope_{int(time.time())}@nowhere.tld"})
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        # No devLink for unknown user (no token created)
        assert "devLink" not in data or data.get("devLink") is None

    def test_forgot_password_missing_email(self, session):
        r = session.post(f"{API}/auth/forgot-password", json={})
        assert r.status_code == 400

    def test_reset_password_full_flow(self, session):
        # Create a temp user via admin
        admin_r = session.post(f"{API}/auth/login", json=ADMIN)
        admin_tok = admin_r.json()["token"]
        fid = session.get(f"{API}/faculties").json()["items"][0]["id"]
        ts = int(time.time())
        email = f"TEST_pwreset_{ts}@example.com"
        old_pw = "OldPw@2026"
        new_pw = "NewPw@2026"
        rc = session.post(f"{API}/auth/register", json={
            "name": "PwReset User", "email": email, "password": old_pw,
            "role": "faculty_publisher", "facultyId": fid,
        }, headers=H(admin_tok))
        assert rc.status_code == 201, rc.text

        # Request forgot-password
        rf = session.post(f"{API}/auth/forgot-password", json={"email": email})
        assert rf.status_code == 200
        dev_link = rf.json().get("devLink")
        assert dev_link, "devLink should be present in SKIP mode"
        token = dev_link.split("token=")[-1]
        assert token and len(token) >= 32

        # Reset password
        rr = session.post(f"{API}/auth/reset-password", json={"token": token, "password": new_pw})
        assert rr.status_code == 200, rr.text
        assert rr.json().get("ok") is True

        # Login with new password
        rl = session.post(f"{API}/auth/login", json={"email": email, "password": new_pw})
        assert rl.status_code == 200, rl.text
        # Old password should no longer work
        rl_old = session.post(f"{API}/auth/login", json={"email": email, "password": old_pw})
        assert rl_old.status_code == 401

        # Re-using the same token must fail
        rr2 = session.post(f"{API}/auth/reset-password", json={"token": token, "password": "ThirdPw@2026"})
        assert rr2.status_code == 400

    def test_reset_password_invalid_token(self, session):
        r = session.post(f"{API}/auth/reset-password", json={"token": "deadbeef" * 8, "password": "Whatever1!"})
        assert r.status_code == 400

    def test_reset_password_too_short(self, session):
        r = session.post(f"{API}/auth/reset-password", json={"token": "x" * 64, "password": "abc"})
        assert r.status_code == 400


# ---------- Iteration 3: schedules ----------
class TestSchedules:
    def _faculty_id(self, session):
        return session.get(f"{API}/faculties").json()["items"][0]["id"]

    def test_public_list_published_only(self, session):
        r = session.get(f"{API}/schedules")
        assert r.status_code == 200
        items = r.json()["items"]
        assert isinstance(items, list)
        for it in items:
            assert it["status"] == "published"

    def test_admin_creates_published(self, session, admin_token):
        fid = self._faculty_id(session)
        ts = int(time.time())
        payload = {
            "type": "cours", "title": f"TEST_Sched_Admin_{ts}",
            "promotion": "L1", "academicYear": "2025-2026", "semester": "S1",
            "facultyId": fid, "description": "Created by admin",
        }
        r = session.post(f"{API}/schedules", json=payload, headers=H(admin_token))
        assert r.status_code == 201, r.text
        item = r.json()["item"]
        assert item["status"] == "published"
        assert item["type"] == "cours"
        assert item["promotion"] == "L1"
        # Visible in public listing
        r2 = session.get(f"{API}/schedules", params={"type": "cours", "promotion": "L1"})
        ids = [s["id"] for s in r2.json()["items"]]
        assert item["id"] in ids

    def test_publisher_creates_pending(self, session, publisher_token):
        ts = int(time.time())
        payload = {
            "type": "examen", "title": f"TEST_Sched_Pub_{ts}",
            "promotion": "L2", "academicYear": "2025-2026", "semester": "S2",
            "description": "From publisher",
        }
        r = session.post(f"{API}/schedules", json=payload, headers=H(publisher_token))
        assert r.status_code == 201, r.text
        item = r.json()["item"]
        assert item["status"] == "pending"
        # Should NOT appear in public list yet
        r2 = session.get(f"{API}/schedules")
        assert item["id"] not in [s["id"] for s in r2.json()["items"]]
        return item["id"]

    def test_approve_workflow(self, session, publisher_token, admin_token):
        sid = self.test_publisher_creates_pending(session, publisher_token)
        r = session.post(f"{API}/schedules/{sid}/approve", headers=H(admin_token))
        assert r.status_code == 200
        assert r.json()["item"]["status"] == "published"

    def test_reject_workflow(self, session, publisher_token, admin_token):
        sid = self.test_publisher_creates_pending(session, publisher_token)
        r = session.post(f"{API}/schedules/{sid}/reject", json={"reason": "Date erronée"}, headers=H(admin_token))
        assert r.status_code == 200
        item = r.json()["item"]
        assert item["status"] == "rejected"
        assert item["rejectionReason"] == "Date erronée"

    def test_filter_by_type_and_promotion(self, session, admin_token):
        fid = self._faculty_id(session)
        ts = int(time.time())
        # create cours L1
        session.post(f"{API}/schedules", json={
            "type": "cours", "title": f"TEST_Filt_Cours_{ts}", "promotion": "L1",
            "facultyId": fid, "academicYear": "2025-2026",
        }, headers=H(admin_token))
        # create examen L3
        session.post(f"{API}/schedules", json={
            "type": "examen", "title": f"TEST_Filt_Exam_{ts}", "promotion": "L3",
            "facultyId": fid, "academicYear": "2025-2026",
        }, headers=H(admin_token))
        r = session.get(f"{API}/schedules", params={"type": "examen", "promotion": "L3", "facultyId": fid})
        assert r.status_code == 200
        for it in r.json()["items"]:
            assert it["type"] == "examen"
            assert it["promotion"] == "L3"
            assert it["facultyId"] == fid

    def test_publisher_cannot_approve(self, session, publisher_token):
        sid = self.test_publisher_creates_pending(session, publisher_token)
        r = session.post(f"{API}/schedules/{sid}/approve", headers=H(publisher_token))
        assert r.status_code == 403

    def test_create_requires_auth(self, session):
        r = session.post(f"{API}/schedules", json={"type": "cours", "title": "x", "promotion": "L1"})
        assert r.status_code == 401

    def test_create_invalid_type(self, session, admin_token):
        fid = self._faculty_id(session)
        r = session.post(f"{API}/schedules", json={
            "type": "tp", "title": "Bad", "promotion": "L1", "facultyId": fid,
        }, headers=H(admin_token))
        assert r.status_code == 400


# ---------- Iteration 3: dashboard stats include schedules ----------
class TestDashboardSchedules:
    def test_stats_include_schedule_counts(self, session, admin_token):
        r = session.get(f"{API}/dashboard/stats", headers=H(admin_token))
        assert r.status_code == 200
        d = r.json()
        assert "schedulesTotal" in d and isinstance(d["schedulesTotal"], int)
        assert "schedulesPending" in d and isinstance(d["schedulesPending"], int)


# ---------- Iteration 4: centers ----------
class TestCenters:
    def test_public_list_centers(self, session):
        r = session.get(f"{API}/centers")
        assert r.status_code == 200
        items = r.json()["items"]
        assert isinstance(items, list)
        assert len(items) >= 1, "seed should create centers (credda/cripe/bersac)"
        slugs = [c.get("slug") for c in items]
        assert "credda" in slugs
        # JSON fields must be deserialized to arrays/objects (not strings)
        for c in items:
            assert isinstance(c.get("domaineInterventions"), list)
            assert isinstance(c.get("partenaires"), list)
            assert isinstance(c.get("contacts"), list)
            assert isinstance(c.get("etudesRealisees"), list)
            if c.get("direction") is not None:
                assert isinstance(c["direction"], dict)

    def test_get_center_credda_by_slug(self, session):
        r = session.get(f"{API}/centers/slug/credda")
        assert r.status_code == 200
        item = r.json()["item"]
        assert item["slug"] == "credda"
        # Direction is fully parsed
        d = item.get("direction")
        assert isinstance(d, dict)
        assert d.get("name") == "Prof. Dr. Kennedy Kihangi Bindu"
        # email/phone are arrays
        assert isinstance(d.get("email", []), list)
        assert isinstance(d.get("phone", []), list)
        assert isinstance(item.get("partenaires"), list)
        assert isinstance(item.get("contacts"), list)

    def test_get_center_unknown_slug_404(self, session):
        r = session.get(f"{API}/centers/slug/does-not-exist-xyz")
        assert r.status_code == 404

    def test_admin_creates_published_center(self, session, admin_token):
        ts = int(time.time())
        payload = {
            "title": f"TEST_Center_Admin_{ts}",
            "description": "Description du centre admin",
            "profile": "<p>Profile HTML</p>",
            "coverImage": "https://example.com/img.jpg",
            "direction": {"name": "Dr Test", "role": "Directeur", "email": ["d@x.com"], "phone": ["+243000"]},
            "domaineInterventions": ["Recherche", "Formation"],
            "etudesRealisees": [{"title": "Étude 1", "year": "2024"}],
            "partenaires": ["UE", "USAID"],
            "contacts": [{"label": "Bureau", "value": "Goma"}],
            "images": ["https://example.com/a.jpg"],
        }
        r = session.post(f"{API}/centers", json=payload, headers=H(admin_token))
        assert r.status_code == 201, r.text
        item = r.json()["item"]
        assert item["status"] == "published"
        assert item["publishedAt"] is not None
        assert isinstance(item["domaineInterventions"], list) and "Recherche" in item["domaineInterventions"]
        assert isinstance(item["partenaires"], list) and "UE" in item["partenaires"]
        assert item["direction"]["name"] == "Dr Test"
        # Verify visible publicly
        r2 = session.get(f"{API}/centers/slug/{item['slug']}")
        assert r2.status_code == 200
        return item["id"], item["slug"]

    def test_publisher_creates_pending_center(self, session, publisher_token):
        ts = int(time.time())
        payload = {
            "title": f"TEST_Center_Pub_{ts}",
            "description": "Centre publisher",
            "domaineInterventions": ["Test"],
        }
        r = session.post(f"{API}/centers", json=payload, headers=H(publisher_token))
        assert r.status_code == 201, r.text
        item = r.json()["item"]
        assert item["status"] == "pending"
        # Not in public list yet
        r2 = session.get(f"{API}/centers")
        assert item["id"] not in [c["id"] for c in r2.json()["items"]]
        return item["id"]

    def test_admin_updates_center_all_fields(self, session, admin_token):
        cid, _ = self.test_admin_creates_published_center(session, admin_token)
        update = {
            "title": f"TEST_Updated_{int(time.time())}",
            "description": "Updated description",
            "domaineInterventions": ["NouveauDomaine"],
            "partenaires": ["NewPartner"],
            "direction": {"name": "Updated Director", "role": "DG", "email": ["new@x.com"], "phone": []},
            "contacts": [{"label": "Tel", "value": "+243111"}],
            "etudesRealisees": [],
        }
        r = session.put(f"{API}/centers/{cid}", json=update, headers=H(admin_token))
        assert r.status_code == 200, r.text
        item = r.json()["item"]
        assert item["description"] == "Updated description"
        assert item["domaineInterventions"] == ["NouveauDomaine"]
        assert item["partenaires"] == ["NewPartner"]
        assert item["direction"]["name"] == "Updated Director"
        assert item["contacts"][0]["value"] == "+243111"

    def test_admin_approve_center(self, session, publisher_token, admin_token):
        cid = self.test_publisher_creates_pending_center(session, publisher_token)
        r = session.post(f"{API}/centers/{cid}/approve", headers=H(admin_token))
        assert r.status_code == 200
        assert r.json()["item"]["status"] == "published"

    def test_admin_reject_center(self, session, publisher_token, admin_token):
        cid = self.test_publisher_creates_pending_center(session, publisher_token)
        r = session.post(f"{API}/centers/{cid}/reject", json={"reason": "Hors périmètre"}, headers=H(admin_token))
        assert r.status_code == 200
        item = r.json()["item"]
        assert item["status"] == "rejected"
        assert item["rejectionReason"] == "Hors périmètre"

    def test_publisher_admin_list_filtered_by_author(self, session, publisher_token):
        # Create a pending one as publisher then list admin should only return own items
        self.test_publisher_creates_pending_center(session, publisher_token)
        r = session.get(f"{API}/centers/admin", headers=H(publisher_token))
        assert r.status_code == 200
        items = r.json()["items"]
        # all returned items should belong to publisher (authorId is publisher's id)
        # publisher's email
        me = session.get(f"{API}/auth/me", headers=H(publisher_token)).json()["user"]
        for it in items:
            assert it.get("authorId") == me["id"]

    def test_create_center_requires_auth(self, session):
        r = session.post(f"{API}/centers", json={"title": "x", "description": "y"})
        assert r.status_code == 401

    def test_create_center_missing_fields(self, session, admin_token):
        r = session.post(f"{API}/centers", json={"title": "  "}, headers=H(admin_token))
        assert r.status_code == 400

