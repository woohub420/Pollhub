# PollHub — 나중에 할 일 메모

## 이메일 (SMTP) 설정 — 나중에 해야 함

현재 상태: Supabase 기본 이메일 사용 중 (시간당 3개 제한)
나중에 유저 많아지면 SMTP 설정 필요

### 설정 방법
1. Gmail 새로 만들기 (전화번호 없이 시도)
   또는 Proton Mail / Zoho Mail 사용
2. 2단계 인증 켜기
3. App Password 생성 (16자리)
4. Supabase → Authentication → SMTP Settings 에 입력:
   - Host: smtp.gmail.com
   - Port: 587
   - Username: 이메일 주소
   - Password: App Password (16자리)
   - Sender: ypmedia.contact (또는 새 이메일)

### 왜 필요한가
- 비밀번호 재설정 이메일
- 이메일 인증 이메일
- 현재 Supabase 무료 플랜: 시간당 3개 제한

---

## Supabase 프로젝트 정보
- Project URL: https://vrqwvipfcjdlqgycnhof.supabase.co
- Project ref: vrqwvipfcjdlqgycnhof
- Region: Canada (Central) ca-central-1

---

## Vercel 프로젝트
- URL: https://pollhub-mu.vercel.app
- GitHub: woohub420/Pollhub (auto-deploy on push to main)

---

## 환경변수 목록 (값은 Vercel 대시보드에서 확인)
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
- VITE_TURNSTILE_SITE_KEY
- VITE_POSTHOG_KEY
- VITE_POSTHOG_HOST
- TURNSTILE_SECRET_KEY (secret — Vercel only)
- SUPABASE_SERVICE_ROLE_KEY (secret — Vercel only)
- UNSPLASH_ACCESS_KEY

---

## 나중에 할 것들
- [ ] SMTP 이메일 설정
- [ ] 도메인 구매 (pollhub.com 같은)
- [ ] 비즈니스 이메일 설정
- [ ] Reddit 공식 API 등록 (seeder 업그레이드용)
- [ ] 추천 알고리즘 / event tracking
- [ ] 프리미엄 구독 / 수익화
- [ ] PWA / 푸시 알림
- [ ] OG 미리보기 태그
