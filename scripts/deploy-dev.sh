#!/usr/bin/env bash
# 랜딩 페이지(HP-87)를 dev EKS 에 배포한다 — 이미지 빌드 → ECR push → 롤아웃 → 검증.
#
# 사용법:
#   bash scripts/deploy-dev.sh            # 새 태그(dev-<커밋>-<시각>)로 빌드·배포
#   bash scripts/deploy-dev.sh <태그>      # ECR 에 이미 있는 태그로 롤백/재배포(빌드 생략)
#
# 전제:
#   - AWS 자격증명(계정 526247032981) · docker · kubectl
#   - kubeconfig: aws eks update-kubeconfig --region ap-northeast-2 --name replix
#   - k8s 매니페스트는 Replix-be 레포 k8s/(base/landing.yaml + overlays/dev)에 있다.
#     이 스크립트는 이미지만 갈아 끼운다(kubectl set image) — 매니페스트 변경은 그쪽에서 apply 한다.
#
# ⚠️ 부동 태그(:latest)를 쓰지 않는 이유는 BE 와 같다 — 무엇이 떠 있는지 태그로 특정되지 않으면
#    롤백 대상을 지목할 수 없다(Jenkinsfile 헤더의 태그 정책 주석 참조).
set -euo pipefail

REGION=ap-northeast-2
ACCOUNT=526247032981
REGISTRY="${ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com"
REPO=replix-landing
NS=dev
DEPLOY=landing
HOST=landing.replix-dev.site

cd "$(dirname "$0")/.."

if [[ $# -ge 1 ]]; then
  TAG="$1"
  echo "▶ 기존 태그로 재배포: $TAG (빌드 생략)"
else
  # 커밋 + 시각. 커밋만 쓰면 미커밋 상태로 두 번 배포할 때 같은 태그가 나와 무엇이 떴는지 흐려진다.
  TAG="dev-$(git rev-parse --short HEAD)-$(date +%m%d%H%M)"
  echo "▶ 빌드: $REGISTRY/$REPO:$TAG"
  # EKS 노드가 amd64 라 macOS(arm64)에서 그냥 빌드하면 exec format error 로 CrashLoop 한다.
  docker build --platform linux/amd64 -t "$REGISTRY/$REPO:$TAG" -t "$REGISTRY/$REPO:dev-latest" .
  aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$REGISTRY"
  docker push "$REGISTRY/$REPO:$TAG"
  # dev-latest 도 함께 민다 — 매니페스트(k8s/base/landing.yaml)가 이 태그를 가리키므로,
  # 누군가 kustomize 를 다시 apply 해도 방금 배포한 것과 같은 내용이 뜬다.
  docker push "$REGISTRY/$REPO:dev-latest"
fi

echo "▶ 롤아웃"
kubectl -n "$NS" set image "deployment/$DEPLOY" landing="$REGISTRY/$REPO:$TAG"
kubectl -n "$NS" rollout status "deployment/$DEPLOY" --timeout=180s

echo "▶ 검증"
# DNS(가비아 CNAME)가 아직 안 붙었어도 확인할 수 있도록, 호스트 이름은 그대로 두고
# 주소만 ALB 로 강제한다(--resolve). ⚠️ URL 을 ALB 이름으로 바꾸면 안 된다 — 인증서가
# *.replix-dev.site 라 SNI 가 ALB 이름이 되는 순간 TLS 검증에서 깨진다.
ALB=$(kubectl -n "$NS" get ingress replix-dev -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
code=$(curl -s -o /dev/null -w '%{http_code}' "https://$HOST/" --resolve "$HOST:443:$(dig +short "$ALB"|head -1)" || true)
echo "  https://$HOST/ → $code  (ALB: $ALB)"
[[ "$code" == "200" ]] || { echo "✗ 200 이 아니다 — 파드/인그레스 상태를 확인할 것"; exit 1; }
echo "✓ 배포 완료: $TAG"
