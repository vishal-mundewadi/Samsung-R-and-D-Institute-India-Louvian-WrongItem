async function run() {
  const base = "http://localhost:5000/api/auth";
  const headers = { "Content-Type": "application/json" };

  const reg = await fetch(`${base}/register`, {
    method: "POST",
    headers,
    body: JSON.stringify({ name: "Test", email: "test@test.com", password: "test123" }),
  });
  console.log("REGISTER:", reg.status, await reg.json());

  const login = await fetch(`${base}/login`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email: "test@test.com", password: "test123" }),
  });
  console.log("LOGIN:", login.status, await login.json());
}

run();