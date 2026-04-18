# Kubernetes Service Exposure — Hello App

A minimal **Node.js + Express** app that returns plain text `Hello from Kubernetes`, packaged with **Docker**, runnable on **Kubernetes**, and exposed with a **Service** (NodePort or LoadBalancer).

---

## What each piece does

| Piece | WHAT | WHY |
|--------|------|-----|
| **Application** | HTTP server on port 8080 | Something real for users to hit in a browser or with `curl` |
| **Dockerfile** | Builds a portable image with Node + your code | Kubernetes runs **containers** from images, not your laptop folder |
| **Docker Hub** | Stores the image remotely | Every cluster node can `docker pull` (or container runtime equivalent) the same bits |
| **Deployment** | Keeps N **Pods** running your image | Restarts crashes, scales replicas, supports rolling updates |
| **Service** | Stable IP/DNS + port mapping to Pods | Pods come and go; the Service is the stable front door (including **external** access for NodePort/LoadBalancer) |

---

## Project layout

```
k8s-hello-app/
├── server.js                      # App source
├── package.json
├── Dockerfile
├── .dockerignore
├── kubernetes/
│   ├── deployment.yaml            # Replace YOUR_DOCKERHUB_USERNAME in image:
│   ├── service-nodeport.yaml      # Good for Minikube / kind / local labs
│   └── service-loadbalancer.yaml  # Good for cloud clusters with a cloud LB
└── README.md
```

---

## Prerequisites

- **Docker** installed and logged in to Docker Hub: `docker login`
- **kubectl** configured to talk to your cluster (`kubectl cluster-info` works)
- **Kubernetes** cluster (e.g. **Minikube**): `minikube start`

Replace **`YOUR_DOCKERHUB_USERNAME`** everywhere below with your Docker Hub username (or another registry you use).

---

## Step-by-step execution workflow

### Step 1 — Run the app locally (optional sanity check)

**WHAT:** Confirms Node and dependencies work before you containerize.

**WHY:** Faster feedback than rebuilding images on every typo.

**Commands (Windows PowerShell or Linux/macOS bash):**

```bash
cd k8s-hello-app
npm install
npm start
```

**Expected output:**

- Terminal prints something like: `Server listening on http://0.0.0.0:8080`
- Browser or `curl http://localhost:8080/` shows: `Hello from Kubernetes`

Stop with `Ctrl+C`.

**Windows note:** If binding to **8080** fails with `EACCES` / `permission denied`, a common cause is a **Hyper-V / excluded TCP port range**. The container still uses **8080** inside Kubernetes; for local testing only, run `set PORT=3001` (cmd) or `$env:PORT='3001'` (PowerShell) before `npm start`.

---

### Step 2 — Build the Docker image

**WHAT:** Packages the app + runtime into an image tagged for your registry.

**WHY:** Kubernetes will pull this image to create Pods.

**Commands:**

```bash
cd k8s-hello-app
docker build -t YOUR_DOCKERHUB_USERNAME/hello-k8s:1.0.0 .
```

**Expected output:**

- `Successfully built ...` and `Successfully tagged YOUR_DOCKERHUB_USERNAME/hello-k8s:1.0.0`

**Verify image exists:**

```bash
docker images YOUR_DOCKERHUB_USERNAME/hello-k8s
```

---

### Step 3 — Push the image to Docker Hub

**WHAT:** Uploads the image so your cluster (which is not your laptop disk) can pull it.

**WHY:** Unless you use a local-only flow (e.g. `minikube image load`), nodes need a registry URL.

**Commands:**

```bash
docker login
docker push YOUR_DOCKERHUB_USERNAME/hello-k8s:1.0.0
```

**Expected output:**

- Layers upload with progress; final line indicates push success.

**Minikube alternative (no push):** load image into the VM:

```bash
docker build -t hello-k8s:1.0.0 .
minikube image load hello-k8s:1.0.0
```

Then in `kubernetes/deployment.yaml` set `image: hello-k8s:1.0.0` and `imagePullPolicy: Never` (or `IfNotPresent` if the tag is present locally in Minikube’s Docker).

---

### Step 4 — Point the Deployment at your real image

**WHAT:** Edit `kubernetes/deployment.yaml` and replace `YOUR_DOCKERHUB_USERNAME` in the `image:` field.

**WHY:** Placeholders avoid accidentally deploying someone else’s image name.

---

### Step 5 — Apply Kubernetes manifests

**WHAT:** Sends YAML to the API server so the control plane creates/updates objects.

**WHY:** Declarative config is repeatable and version-control friendly.

**Commands:**

```bash
cd k8s-hello-app
kubectl apply -f kubernetes/deployment.yaml
kubectl apply -f kubernetes/service-nodeport.yaml
```

**Expected output (example):**

```
deployment.apps/hello-k8s created
service/hello-k8s created
```

**Idempotency:** Running `kubectl apply` again shows `configured` instead of `created` if you changed files.

---

### Step 6 — Verify workloads and networking

**WHAT:** Confirm Pods are ready and the Service has endpoints.

**WHY:** If Pods are not `Running`/`READY`, the Service has nothing to forward to.

**Commands:**

```bash
kubectl get deployments
kubectl get pods -l app=hello-k8s -o wide
kubectl get svc hello-k8s
kubectl describe svc hello-k8s
kubectl get endpoints hello-k8s
```

**Expected output (roughly):**

- `deployments`: `READY` matches desired replicas (e.g. `2/2`).
- `pods`: `STATUS` `Running`, `READY` `1/1`.
- `svc`: `TYPE` `NodePort`, `PORT(S)` like `8080:30080/TCP`.
- `endpoints`: shows Pod IPs (non-empty means traffic can flow).

**Logs (one Pod):**

```bash
kubectl logs -l app=hello-k8s --tail=50
```

---

## How to open the app in a browser

### A) NodePort + **Minikube**

**WHAT:** Minikube runs Kubernetes in a VM; traffic to the VM’s IP on the NodePort reaches your Service.

**WHY:** Your laptop is not a cluster node, so `localhost:30080` usually does **not** work unless you tunnel.

**Command:**

```bash
minikube service hello-k8s --url
```

**Expected output:** A URL such as `http://192.168.49.2:30080` — open it in a browser.

You should see: **Hello from Kubernetes**

### B) NodePort + **kind** or **other** clusters

Use any **node IP** that can reach the cluster nodes plus **port `30080`** (from `service-nodeport.yaml`), or run:

```bash
kubectl port-forward svc/hello-k8s 8080:8080
```

Then open `http://localhost:8080/`.

**Expected:** `Hello from Kubernetes`

### C) **LoadBalancer** on a cloud cluster

**WHAT:** Apply `kubernetes/service-loadbalancer.yaml` instead of (or after deleting) the NodePort Service if your platform supports it.

**WHY:** You get a cloud-managed public IP or hostname.

**Commands:**

```bash
kubectl delete svc hello-k8s
kubectl apply -f kubernetes/service-loadbalancer.yaml
kubectl get svc hello-k8s -w
```

**Expected:** `EXTERNAL-IP` eventually becomes non-`<pending>`; browse `http://<EXTERNAL-IP>/` (port 80 in that manifest).

---

## Testing and verification commands

| Goal | Command |
|------|---------|
| HTTP from inside a throwaway Pod | `kubectl run curl-test --rm -it --restart=Never --image=curlimages/curl -- curl -sS http://hello-k8s.default.svc.cluster.local:8080/` |
| Health JSON | Same as above but path `/health` |
| From your machine via port-forward | `kubectl port-forward svc/hello-k8s 8080:8080` then `curl http://localhost:8080/` |
| Rollout status | `kubectl rollout status deployment/hello-k8s` |

**Expected:** `curl` to `/` returns exactly `Hello from Kubernetes`. `/health` returns JSON like `{"status":"ok"}`.

---

## Cleanup

```bash
kubectl delete -f kubernetes/service-nodeport.yaml
kubectl delete -f kubernetes/deployment.yaml
```

(Adjust filenames if you used LoadBalancer Service instead.)

---

## Troubleshooting (short)

- **`ImagePullBackOff`:** Wrong image name, not pushed, or private repo without `imagePullSecrets`.
- **`CrashLoopBackOff`:** Check `kubectl logs` on the Pod; often port or start command issues.
- **Service has no `ENDPOINTS`:** Label mismatch between Service `selector` and Pod `metadata.labels`, or Pods not ready.

---

## Quick reference — Docker build & push

```bash
docker build -t YOUR_DOCKERHUB_USERNAME/hello-k8s:1.0.0 .
docker push YOUR_DOCKERHUB_USERNAME/hello-k8s:1.0.0
```

```bash
kubectl apply -f kubernetes/deployment.yaml
kubectl apply -f kubernetes/service-nodeport.yaml
minikube service hello-k8s --url
```
