# 랜딩 페이지(HP-87) 정적 서빙 이미지 — 팀 리뷰용 임시 미리보기(landing.replix-dev.site) 전용.
# 어떤 브랜치에도 자동 연결되지 않는다(2026-08-06 결정) — 보고 싶을 때 scripts/deploy-dev.sh
# 로 사람이 직접 올린다. 실제 배포(replix.tv)는 이 이미지를 거치지 않고 main 머지 시
# GitHub Pages 가 docs/ 를 그대로 서빙한다(레포 루트 README 참조).
# 빌드 단계가 없다: docs/ 의 파일이 그대로 배포물이다(번들러 미도입 — docs/README.md 참조).
# 태그·푸시·롤아웃은 scripts/deploy-dev.sh 가 한다.
#
# unprivileged 변형을 쓰는 이유: 공식 nginx 이미지는 마스터가 root 로 떠 /var/run/nginx.pid
# 등에 쓰기가 필요하다. 이 변형은 처음부터 uid 101 로 8080 을 듣게 만들어져 있어
# 컨테이너에 root 권한을 주지 않아도 된다.
FROM nginxinc/nginx-unprivileged:1.27-alpine

# 기본 서버 블록 제거 — 남겨 두면 8080 을 두 서버 블록이 다퉈 기본 페이지가 먼저 잡힌다.
USER root
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/landing.conf
COPY docs/ /usr/share/nginx/html/
USER 101

EXPOSE 8080
