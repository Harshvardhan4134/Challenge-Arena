/* Challenge Arena — Web Push + notification click */
self.addEventListener("push", (event) => {
  let data = { title: "Challenge Arena", body: "", url: "/" };
  try {
    if (event.data) {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    }
  } catch {
    /* plain text */
    if (event.data) data.body = event.data.text();
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      data: { url: data.url || "/" },
      icon: "/favicon.svg",
      badge: "/favicon.svg",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      const abs = new URL(url, self.location.origin).href;
      for (const client of clientList) {
        if (client.url === abs && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(abs);
    }),
  );
});
