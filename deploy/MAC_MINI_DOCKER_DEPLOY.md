# Mac mini Docker 배포

기존 mac-mini-proxy 공용 Caddy가 HTTPS와 도메인을 처리합니다. SetLog의 docker-compose.yml에는 Nginx 앱 서비스 하나만 있으며 별도의 Caddy, 80/443 바인딩, 인증서 볼륨은 없습니다. Apple Silicon/Intel에 맞춰 Node에서 빌드한 뒤 Nginx가 컨테이너 내부 8080 포트에서 앱 파일을 제공합니다.

## SetLog 실행

공용 Caddy와 SetLog는 같은 Docker 엔진의 외부 네트워크를 사용해야 합니다. 기존 공용 Caddy가 실행 중이면 mac-mini-proxy 네트워크도 이미 존재합니다.

```sh
# SetLog 프로젝트 폴더에서
docker network inspect mac-mini-proxy
docker compose config
docker compose up -d --build
docker compose ps
docker compose logs -f setlog
```

다른 네트워크 이름을 사용하는 경우 .env에 PROXY_NETWORK를 지정하고 공용 Caddy의 네트워크 이름과 맞추세요. 기본 이름이면 .env 없이 실행할 수 있습니다. SETLOG_PORT, SETLOG_DOMAIN은 더 이상 사용하지 않습니다.

SetLog는 호스트 포트를 공개하지 않으므로 localhost:8080으로 직접 접속하는 구성은 아닙니다. 내부 네트워크에서 setlog-web:8080으로 접근하며 사용자는 기존 공용 Caddy의 HTTPS 도메인으로 접속합니다.

## 공용 Caddy 사이트 등록

공용 프록시의 config/sites/setlog.caddy를 다음처럼 설정합니다. 템플릿은 이 저장소의 deploy/setlog.caddy에 있습니다.

```caddyfile
setlog.duckdns.org {
    encode zstd gzip
    reverse_proxy setlog-web:8080
}
```

공용 config/Caddyfile에는 사이트 파일을 읽는 설정이 있어야 합니다. 기존 공통 설정은 유지합니다.

```caddyfile
import sites/*.caddy
```

공용 Caddy Compose 폴더에서 검사하고 반영합니다.

```sh
docker compose exec caddy caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
docker compose exec caddy wget -qO- http://setlog-web:8080/healthz
```

마지막 명령이 ok를 출력하면 Caddy에서 SetLog로 연결됩니다. https://setlog.duckdns.org로 접속하세요. 도메인의 DNS/DuckDNS 갱신과 80/443 연결은 공용 프록시 쪽에서 관리합니다. SetLog 프로젝트에는 도메인을 환경변수로 전달할 필요가 없습니다.

## 재배포와 중지

```sh
# SetLog 폴더에서 최신 소스 반영 후
git pull --ff-only
docker compose up -d --build

# SetLog만 중지
docker compose down
```

SetLog 중지는 외부 네트워크나 별도 프로젝트의 공용 Caddy를 삭제하지 않습니다. 앱 업데이트만 할 때는 공용 Caddy를 재배포할 필요가 없습니다. 도메인 또는 사이트 설정을 바꿀 때는 Caddy를 reload합니다. Mac 재부팅 후 Docker Desktop이 실행되어야 컨테이너가 다시 시작됩니다.

배포 명령은 기본 docker compose 명령으로 통일합니다. 같은 프로젝트 이름 setlog와 서비스 이름 setlog를 유지해 기존 SetLog 컨테이너를 갱신합니다.

## 데이터와 업데이트

운동 데이터는 사용자 브라우저의 IndexedDB에 저장되며 Docker 컨테이너나 Mac mini에 저장되는 구조가 아닙니다. 재배포 시 같은 HTTPS 도메인을 유지하면 기존 브라우저 기록이 유지됩니다. PWA에 업데이트 안내가 뜨면 저장을 마친 뒤 적용하세요. 주소가 바뀌면 이전 주소에서 JSON을 내보내 새 주소에서 병합합니다.

## 검증 범위

Compose 기본 파일과 호환 파일의 설정 및 공유 네트워크·별칭·내부 포트를 검사합니다. Docker 엔진이 실행되지 않는 작업 환경이므로 실제 이미지 빌드, nginx -t, Mac mini에서의 컨테이너 통신과 인증서 발급은 직접 검증하지 못했습니다. 배포 서버에서 위 healthz 연결과 HTTPS 접속을 확인하세요.
