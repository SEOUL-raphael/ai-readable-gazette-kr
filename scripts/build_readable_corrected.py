#!/usr/bin/env python3
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'readable-final'
OUT = ROOT / 'derived' / 'readable-corrected'

COMMON_REPLACEMENTS = [
    ('왘', '의'), ('묏', '및'), ('건먼', '건물'), ('아툌트', '아파트'), ('욐동차', '자동차'),
    ('와행', '은행'), ('쀜울', '서울'), ('눀지', '대지'), ('눀통', '대통'), ('접앙', '중앙'),
    ('가리', '관리'), ('인 사', '인사'), ('상 훈', '상훈'), ('기 타', '기타'), ('눀 통 령', '대통령'),
    ('직옄', '직위'), ('삌삍', '소속'), ('쀱릅', '성명'), ('왴저픑', '비고'), ('왴승윕', '비고'),
    ('관옄', '관장'), ('옄원', '위원'), ('옄회', '위원회'), ('옄원회', '위원회'),
    ('국가공무원법제74조의2에따라그직을면함', '국가공무원법 제74조의2에 따라 그 직을 면함'),
    ('에보함', '에 보함'), ('에임함', '에 임함'), ('가에임함', '관에 임함'),
    ('공윜', '공직'), ('가액 (실거래가격)', '가액(실거래가격)'),
    ('공고합니다.', '공고합니다.'), ('고시합니다.', '고시합니다.'), ('위화번호', '전화번호'), ('위자우편', '전자우편'),
    ('위자가보', '전자관보'), ('윁', '면적'), ('기타궁괈한', '기타 궁금한'), ('송 달', '송달'),
    ('가한', '관한'), ('규윕', '규정'), ('저얩댘는', '준용되는'), ('게리', '권리'), ('릅쀸', '명세'),
    ('입롘', '종류'), ('관계|', '관계 |'), ('성명|', '성명 |'), ('비고|', '비고 |'),
    ('(단옄 : 천원)', '(단위 : 천원)'), ('(삌계)', '(합계)'), ('감삌', '감소'), ('좝가', '증가'),
    ('변동사옠', '변동사유'), ('묰괰량', '배기량'), ('고지거부 및 등띝윜앸사항', '고지거부 및 등록제외사항'),
    ('등띝윜앸사푭', '등록제외사유'), ('등띝윜앸사항', '등록제외사항'), ('근린생한시쀤', '근린생활시설'), ('새마완괈고', '새마을금고'), ('욄눀보좝괈', '임대보증금'), ('괈옵채무', '금융채무'), ('공무원연괈공단', '공무원연금공단'),
]

FINANCE_REPLACEMENTS = [
    ('걭민와행', '국민은행'), ('걭민은행', '국민은행'), ('낍픑와행', '기업은행'), ('낍픑은행', '기업은행'),
    ('우리와행', '우리은행'), ('걭민와풉', '국민은행'), ('낍픑와풉', '기업은행'), ('접삌괰업와풉', '저축은행'), ('우리 와행', '우리은행'), ('신한와행', '신한은행'), ('씨티와행', '씨티은행'),
    ('갑주와행', '광주은행'), ('갑주은행', '광주은행'), ('수픑와행', '수협은행'), ('수픑은행', '수협은행'),
    ('KEB하나와행', 'KEB하나은행'), ('(주)KEB하나와행', '(주)KEB하나은행'), ('한걭카카씤와행(주)', '한국카카오은행(주)'),
    ('한걭카카씤 은행(주)', '한국카카오은행(주)'), ('표걭쵴쵴씤와풉(주)', '한국카카오은행(주)'), ('한걭쵴쵴씤은행(주)', '한국카카오은행(주)'), ('스탠다드차타드와행', '스탠다드차타드은행'),
    ('낍픑접앙햌', '농협중앙회'), ('낍픑중앙햌', '농협중앙회'), ('신얩픑동읰합접앙햌', '신협중앙회'), ('신얩픑동읰합중앙햌', '신협중앙회'), ('신얩픑동읰푩중앙햌', '신협중앙회'),
    ('수픑접앙햌', '수협중앙회'), ('수픑중앙햌', '수협중앙회'), ('한걭산업와행', '한국산업은행'), ('한걭산업은행', '한국산업은행'),
    ('한걭수천욅와행', '한국수출입은행'), ('괰햍재윕벀 한걭수천욅은행', '한국수출입은행'),
    ('하나괈옵턬욐', '하나금융투자'), ('하나금옵턬욐', '하나금융투자'), ('쾤움닷컴좝게', '키움닷컴증권'), ('쾤움닷컴 좝게', '키움닷컴증권'),
    ('옠안타좝게', '유안타증권'), ('한걭턬욐좝게', '한국투자증권'), ('표걭턬욐좝게', '한국투자증권'), ('NH턬욐좝게', 'NH투자증권'), ('삼쀱좝게', '삼성증권'), ('미래에쁋눀우(주)', '미래에셋대우(주)'), ('미래 에쁋생릅보험', '미래에셋생명보험'),
    ('삼쀱생릅보험', '삼성생명보험'), ('낍픑생릅보험', '기업생명보험'), ('삼쀱핔재해상보험', '삼성화재해상보험'), ('삼성 화재해상보험', '삼성화재해상보험'),
    ('걐보생릅 보험', '교보생명보험'), ('걐보생릅보험', '교보생명보험'), ('DB삐해보험(주)', 'DB손해보험(주)'), ('DB삐푴보험(주)', 'DB손해보험(주)'), ('(주)KB삐푴보험', '(주)KB손해보험'), ('띯뉰삐해보험', '롯데손해보험'), ('띯뉰삐해 보험', '롯데손해보험'), ('프눀해상핔재보험', '현대해상화재보험'), ('프눀푴상핔재보험', '현대해상화재보험'),
    ('MG삐해보험(주)', 'MG손해보험(주)'), ('한핔삐해보험', '한화손해보험'), ('홥걭생릅보험', '흥국생명보험'), ('한핔생릅보험주식햌사', '한화생명보험주식회사'), ('표핔생릅보험주식햌사', '교보생명보험주식회사'), ('눀걬은행', '대구은행'), ('한걭걐직원공직햌', '한국교직원공제회'), ('접삌괰업와행', '저축은행'), ('접삌괰업은행', '저축은행'), ('유가좝게', '유가증권'), ('옠가좝게', '유가증권'),
    ('상욥주식', '상장주식'), ('괈옵괰가채먴', '금융기관채무'), ('금옵괰가채무', '금융기관채무'), ('채먴', '채무'), ('채게', '채권'), ('씈괈', '예금'),
    ('사외간채게', '사인간채권'), ('사외간채먴', '사인간채무'),
]

RELATION_REPLACEMENTS = [
    ('찝 계', '합 계'), ('본외과왘 가계', '본인과의 관계'), ('본인과의 가계', '본인과의 관계'),
    ('재산왘 입롘', '재산의 종류'), ('재산의 입롘', '재산의 종류'), ('고지거벀', '고지거부'), ('독립생계옠지', '독립생계유지'),
]

PLACE_REPLACEMENTS = [
    ('위라남도', '전라남도'), ('위라북도', '전라북도'), ('경괰도', '경기도'), ('안쀱시', '안산시'), ('툌주시', '파주시'), ('쀜귀포시', '서귀포시'), ('벀산갑역시', '부산광역시'), ('윜주특별욐쵘도', '제주특별자치도'), ('쀩입특별욐쵘시', '세종특별자치시'), ('쀸입특별욐쵘시', '세종특별자치시'), ('눀위갑역시', '대전광역시'), ('눀걬갑역시', '대구광역시'), ('쀱남시', '성남시'), ('섘원시', '수원시'),
    ('쀜찈걬', '서초구'), ('강쀜걬', '강서구'), ('얩산걬', '용산구'), ('마포걬', '마포구'), ('수지걬', '수지구'), ('쀱산걬', '성산구'), ('쀜찈동', '서초동'),
]

LEGAL_REPLACEMENTS = [
    ('벀동산에 가한 규윕왴 저얩댘는 게리앀 자동차·건쀤괰계·쀠묕 및 항공괰', '부동산에 관한 규정이 준용되는 자동차·건설기계·선박 및 항공기'), ('신묘포11', '신반포11'),
    ('재산등록사항을 다음과 같이 공개합니다.', '재산등록사항을 다음과 같이 공개합니다.'),
    ('정부공직자윤리옄원회', '정부공직자윤리위원회'), ('일반직고옄공무원', '일반직고위공무원'),
    ('일반직고', '일반직고위'), ('선거가리위원회', '선거관리위원회'), ('해양안위심툐원', '해양안전심판원'),
]

# Whole-token fixes for residual broken tokens whose chars remain ambiguous
# (섘, 옄, 괰, 왼, 앸 ...). Derived from frequency scan of readable-corrected.
# See scripts/extract_residual_tokens.py and dump_char_contexts.py.
RESIDUAL_TOKEN_REPLACEMENTS = [
    # 옄 → 위 (옄=장 in 관옄=관장 conflict, so whole-token only)
    ('옄치', '위치'), ('옄 치', '위 치'), ('옄하여', '위하여'), ('옄한', '위한'),
    ('옄해', '위해'), ('옄반', '위반'), ('옄반하여', '위반하여'),
    ('단옄', '단위'), ('범옄', '범위'),
    ('지구단옄계획', '지구단위계획'), ('지구단옄계획구역', '지구단위계획구역'),
    # 괰 → 개/관/기 (ambiguous per token) — 괰계→관계 was WRONG because in
    # 건설괰계 the correct mapping is 괰=기 (건설기계). Use specific compounds.
    # Longer compounds first so .replace() catches them before shorter rules
    ('병과및거사특괰', '병과및군사특기'),
    ('병과및거사특기', '병과및군사특기'),  # after 특괰→특기 in phase 2
    ('장괰면', '장기면'),
    ('괰윕', '개요'), ('괰쿀', '기타'), ('괰괰', '기기'),
    ('건설괰계', '건설기계'), ('복무괰가', '복무관계'),
    ('국가괰가', '국가기관'),
    ('만괰', '만기'), ('장괰', '장기'), ('괰본', '기본'),
    ('특괰', '특기'),
    # 왼/욐 → 일/자 (왼=일 is valid Korean conflict)
    ('왼욐문햌의', '일자문회의'), ('민주평핔통왼욐문햌', '민주평화통일자문회'),
    ('왼욐', '일자'),
    # 앸 → 외 (앸 mostly 외 but skip global; use whole-token)
    ('제앸표다', '제외하다'), ('제앸표', '제외하'), ('제앸푘륰', '제외하며'),
    ('제앸푘고', '제외하고'), ('앸벀', '외부'), ('앸의', '외의'),
    # 섘 → 수 / 남 (ambiguous; 섘=남 in 씥섘동=한남동)
    ('해섘면', '해수면'), ('섘의계약', '수의계약'), ('섘량', '수량'),
    ('섘얩', '수용'), ('씥섘동', '한남동'), ('씥섘', '한남'),
    # 뾬 → 사 (뾬=사)
    ('뾬얩댘놔', '사용되는'), ('뾬얩푘놔', '사용하는'), ('뾬얩', '사용'),
    # Valid-char-in-context compound fixes
    ('갑역시', '광역시'),            # 대구/광주/대전/부산/인천/울산 광역시
    ('갑주', '광주'),                 # 광주(시/군/구/파주 방지는 단독치환으로 충분)
    ('위툌법', '전파법'),
    ('위툌관리소', '전파관리소'),
    ('위툌사용료', '전파사용료'),
    ('위툌관리소장', '전파관리소장'),
    ('주툌수', '주파수'),
    ('접학교', '중학교'),             # 순천매산중학교 등
    # High-freq single-compound tokens that need explicit whole-token
    ('신고의먴욐', '신고의무자'),    # even after 먴→무, 욐→자 this is already covered,
    ('복무부눀', '복무부대'),        # covered by 눀→대
    # 게 → 권 (게 is valid Korean 게시/게임; whole-token only)
    ('지상게', '지상권'),
    ('소유게', '소유권'),
    ('근저당게', '근저당권'),
    ('임차게', '임차권'),
    ('전세게', '전세권'),
    ('회원게', '회원권'),
    ('신주인수게', '신주인수권'),
    # 버 → 분 (버 is valid Korean; whole-token only)
    ('버야', '분야'),
    ('버롘', '분류'),
    ('버롘되지', '분류되지'),
    # 벀버펈 → 부분품 (compound)
    ('벀버펈', '부분품'),
    # 옄쵘 → 위치 (옄 ambiguous, but compound with 쵘 is 위치)
    ('옄쵘', '위치'),
    ('옄 쵘', '위 치'),
    # 괰 ambiguous (기/관/개) — 항공기·저항기 계열은 whole-token
    ('푭공괰', '항공기'),
    ('항공괰', '항공기'),
    ('저푭괰', '저항기'),
    ('저항괰', '저항기'),
    ('가감저푭괰', '가감저항기'),
    ('가감저항괰', '가감저항기'),
    # v2: 왴 ambiguous (비/이) — whole-token
    ('왴푘', '이하'), ('왴푘외', '이하의'), ('왴푘왴륰', '이하이며'),
    ('왴뿁', '이상'), ('왴뿁외', '이상의'), ('왴뿁의', '이상의'),
    ('왴뿁옼띜', '이상으로'),
    ('왴꾘', '이며'), ('것왴꾘', '것이며'),
    ('왴병', '이병'), ('왴들의', '이들의'),
    # v2: 옄 ambiguous 추가 compound
    ('행옄', '행위'), ('행옄를', '행위를'), ('옄탁', '위탁'),
    ('옄험방지', '위험방지'), ('옄임된', '위임된'), ('진옄면', '진위면'),
    # v2: 윕 ambiguous (정/요)
    ('의윕부시', '의정부시'), ('의윕', '의정'),
    ('개윕', '개정'), ('규윕', '규정'),
    # v2: 윜 ambiguous (제/직) — whole-token
    ('해윜', '해제'), ('삌집해윜', '소집해제'),
    # v2: 쀱 ambiguous (성/산/정) — whole-token
    ('푩쀱', '행정'), ('쀱동구', '성동구'),
    # v2: 삌 ambiguous (소/합) — whole-token
    ('삌재지', '소재지'), ('삌재', '소재'), ('삌집', '소집'),
    ('삌픸', '소속'), ('삌재죀', '소재지'),
    # v2: 버(valid)→분 compound
    ('100버의', '100분의'), ('50버의', '50분의'), ('25버의', '25분의'),
    ('병역처버', '병역처분'), ('처버사항', '처분사항'), ('처버일자', '처분일자'),
    ('처버됨', '처분됨'), ('처버된', '처분된'),
    # v2: 가(valid)→관 compound
    ('복무괰가', '복무관계'),
    # v2: 표(valid)→한/하 compound
    ('표정푘륰', '한정하며'), ('표정푘고', '한정하고'),
    ('표정푘지', '한정하지'), ('신쀠표', '신청하'),
    ('포푨푘륰', '포함하며'), ('포푨푘고', '포함하고'),
    # v2: 프(valid)→현 compound
    ('프역', '현역'), ('프금', '현금'),
    ('프역병욅씁대상', '현역병입소대상'),
    # v2: 쑽 ambiguous (술/약)
    ('낍쑽', '기술'), ('낍쑽가뢬뮕', '기술규범'),
    ('낍쑽원제', '기술원제'), ('의쑽품', '의약품'),
    # v2: 뾬(사) compound already handled; add 푨→함 compound
    ('푨옠', '사유'), ('푨옠푘지', '사유하지'), ('푨옠푘놔', '사유하는'),
    # v2: 또놔, 욈놔 etc — mostly handled by single-char 놔→는
    ('또놔', '또는'),
    # v2: 픑 already single_char 협; compound as well
    ('픑동조합', '협동조합'), ('픑업', '협업'), ('픑의', '협의'),
    # v3: additional 괰 compounds
    ('평고해수면괰저', '평균해수면기저'),
    ('서괰가', '서기관'),
    ('경괰닄', '경기도'),
    ('괰타', '기타'),
    # v3: 푨 → 함 (ambiguous sa/ham; use compounds)
    ('포푨표다', '포함한다'),
    ('포푨한다', '포함한다'),
    ('포푨푘다', '포함하다'),
    ('포푨', '포함'),
    # v3: 왼 → 일 (valid Korean 왼쪽, whole-token only)
    ('생년월왼', '생년월일'),
    ('생끄월왼', '생년월일'),
    ('왼병', '일병'),
    ('왼묘회계', '일반회계'),
    ('왼원', '일원'),
    ('왼차제품', '일차제품'),
    # v3: 옄 → 위 additional compounds
    ('군옄군', '군위군'),
    ('북옄', '북위'),
    # v3: 옠 ambiguous (유/업) compounds
    ('사옠', '사업'),
    ('사옠지', '사업지'),
    # v3: 돱 → 등 + 띝 → 록 compounds
    ('돱띝뮈호', '등록번호'),
    ('돱띝일자', '등록일자'),
    ('돱띝', '등록'),
    ('등띝되', '등록되'),
    ('등띝댜', '등록되'),
    # v4: high-frequency compounds from residuals-v4.tsv scan
    # 품릩 → 품목 (품릩뮈픸 → 품목번호 13226건)
    ('품릩뮈픸', '품목번호'),
    ('품릩', '품목'),
    # 옠 ambiguous (유/업) — 유 compounds
    ('옠뾬표', '유사한'),
    ('옠뾬한', '유사한'),
    ('옠뾬', '유사'),
    ('포옠동물', '포유동물'),
    ('포옠', '포유'),
    ('기타왴자수입및재산수입', '기타이자수입 및 재산수입'),
    ('기타왴자수입', '기타이자수입'),
    ('경상왴위수입', '경상외수입'),
    ('기타경상왴위수입', '기타경상외수입'),
    # 섘 → 수 / 신 compounds (섘청동 = 당진시 수청동)
    ('섘청동', '수청동'),
    ('섘청1지구', '수청1지구'),
    ('섘청2지구', '수청2지구'),
    # 푩 → 합 / 화 compounds
    ('접푩체', '중합체'),
    ('핔푩물', '화합물'),
    ('피푩물', '화합물'),
    ('푩금으로', '합금으로'),
    ('적푩표', '적합한'),
    ('적푩한', '적합한'),
    ('적푩하지', '적합하지'),
    ('결푩되', '결합되'),
    ('결푩된', '결합된'),
    # 뢬 → 리 compounds (폴리* 계열)
    ('폴뢬쑄미드', '폴리아미드'),
    ('폴뢬에솤큌롴', '폴리에스테르'),
    ('폴뢬에솤큌롴의', '폴리에스테르의'),
    ('폴뢬에', '폴리에'),
    ('폴뢬', '폴리'),
    # 버(valid)→분 compounds (구버지상권 = 구분지상권)
    ('구버지상권', '구분지상권'),
    ('구버되', '구분되'),
    ('구버된', '구분된'),
    ('구버하', '구분하'),
    ('버햍물', '분해물'),
    # 옄 → 위 residual compounds (will also be caught by single-char global)
    ('품옄', '품위'),
    ('상옄', '상위'),
    ('순옄', '순위'),
    ('허옄', '허위'),
    ('학옄', '학위'),
    ('하옄', '하위'),
    ('접옄', '중위'),
    ('법옄', '법위'),  # rare; safer as compound
    # 식품/방위 계열 (global 옄→위 will handle, kept for 2-pass safety)
    ('식품옄생법', '식품위생법'),
    ('방옄사업청', '방위사업청'),
    # v5: residuals-v5.tsv pass. Loanword compounds (chem/polymer/tariff HS)
    # — most handled by single_char 솤/큌/롴/퐄 globals below; residual
    # compounds needed for chars that stay ambiguous.
    ('뵄쿀민', '비타민'),
    ('퐄로뵄쿀민', '프로비타민'),  # belt-and-suspenders after 퐄→프
    # 옠닄체/핔옠닄체 — 닄=기 in organic-chemistry context only
    ('옠닄체', '유기체'),
    ('핔옠닄체', '화유기체'),
    # 묀폐용괰 → 개폐용기 (괰=기 specific compound)
    ('묀폐용괰에', '개폐용기에'),
    ('묀폐용괰', '개폐용기'),
    # 처뢬 → 처리 compounds (뢬=리 in processing context;
    # conflicts with 뢬=월/법 so compound-only)
    ('옠연처뢬', '유연처리'),
    ('처뢬하지', '처리하지'),
    ('처뢬된', '처리된'),
    ('처뢬되', '처리되'),
    ('처뢬한', '처리한'),
    ('처뢬표', '처리한'),
    ('처뢬', '처리'),
    # 기술가뢬뮕 → 기술규범
    ('｢기술가뢬뮕｣', '｢기술규범｣'),
    ('기술가뢬뮕', '기술규범'),
    # 핔푙 → 화학 (푙=학)
    ('핔푙적으로', '화학적으로'),
    ('핔푙적', '화학적'),
    ('핔푙', '화학'),
    # 묩 → 포 compound (묩죁용=포장용, HS code context)
    ('묩죁용', '포장용'),
    ('묩죁', '포장'),
    # 쀬옠 → 자료 (administration) / 재료 (HS code); default 자료
    ('행정쀬옠로', '행정자료로'),
    ('외조쀬옠로', '외조자료로'),
    ('쀬옠로', '자료로'),
    ('쀬옠의', '자료의'),
    # 쀱 → 성 compound continuations
    ('여쀱왴므로', '여성이므로'),
    ('여쀱', '여성'),
    ('식물쀱', '식물성'),
    ('갑물쀱', '광물성'),
    ('므쀱', '모성'),
    ('구쀱하는', '구성하는'),
    ('구쀱되', '구성되'),
    ('구쀱된', '구성된'),
    ('구쀱', '구성'),
    # 외래어 compound (belt-and-suspenders; mostly handled by single_char)
    ('퐌라솤틱으로', '플라스틱으로'),
    ('퐌라솤틱', '플라스틱'),
    ('데시큍솤', '데시벨'),
    ('륔가파솤쵼', '메가파스칼'),
    ('초뾰쁀룰로오솤', '니트로셀룰로오스'),
    # 염섘장표 → 염수장한 (섘=수, 표=한)
    ('염섘장표', '염수장한'),
    # v6: residuals-v5-after.tsv pass (post-filter exposure of 뵄, 묀, 닄)
    # 뵄 → 비: 뵄고=비고(8996), 뵄금속=비금속, 설뵄=설비 etc. Single-char
    # safe (578 neighbors, all → 비). Handled in single_char_final below.
    # Compound belt-and-suspenders:
    ('뵄금속', '비금속'),
    ('뵄금속의', '비금속의'),
    # 묀양시 → 밀양시 (경상남도 밀양시). 묀 ambiguous globally
    # (정면/정밀/비밀/훼손 all possible) so compound-only.
    ('묀양시청', '밀양시청'),
    ('묀양시', '밀양시'),
    # 닄포표 → 도포한 (HS tariff: coated paper/surface, NOT 공포한).
    # Evidence: "닄포표 종이", "쵨턬ㆍ닄포표 것" — 코팅/도포 계열 어휘.
    # 닄 remains ambiguous across contexts (도포/유기체 둘 다 존재),
    # so compound-only.
    ('닄포표', '도포한'),
    ('닄포된', '도포된'),
    ('닄포되', '도포되'),
    ('닄포', '도포'),
    # v6 regression fix: HS code context has 쀬옠=재료 (not 자료).
    # v5 added 쀬옠의→자료의 which over-applied. Post-fix with specific
    # loanword compounds that survived v5 as "스테이퐌자료*".
    # 스테이퐌 likely = 스테이플 (staple).
    ('스테이퐌자료의', '스테이플 재료의'),
    ('스테이퐌자료로', '스테이플 재료로'),
    ('스테이퐌자료', '스테이플 재료'),
    # v7: last round. Compounds only (diminishing returns on globals).
    # HS tariff vocabulary + budget line fragments.
    # 릩욬 → 목재 (lumber/wood — "섬유소 릩욬" = cellulose from wood)
    ('릩욬', '목재'),
    # 뮕원 / 대뮕원 → 법원 (Supreme Court / courts budget line)
    # 뮕 is ambiguous (법 in 법원, 범 in 기술규범) — compound only.
    ('대뮕원', '대법원'),
    ('뮕원및헌재', '법원 및 헌재'),
    ('뮕원', '법원'),
    # 피묩 → 피복 (coated/covered, HS textiles). 묩=복 here; 묩 too
    # ambiguous for single-char (포/복/방/무 all seen).
    ('피묩표', '피복한'),
    ('피묩된', '피복된'),
    ('피묩', '피복'),
    # 국묩거사시설 → 국방 군사시설 (military land use).
    # 묩=방 in this context (distinct from 묩=포/복 elsewhere).
    ('국묩거사시설용지', '국방 군사시설용지'),
    ('국묩거사시설', '국방 군사시설'),
    # 틉죁물 → 평직물 (平織物, HS 5208 cotton plain weave)
    ('틉죁물', '평직물'),
    # 죁물 → 직물 (generic HS textile word; 죁 → 직 also via global below)
    ('죁물로', '직물로'),
    ('죁물', '직물'),
    # 며왼띠이며 → 나일론이며 (HS polyamide/nylon context).
    # 며왼띠 = 나일론 (4 chars → 3 chars; 며=나, 왼=일, 띠=론).
    ('며왼띠이며', '나일론이며'),
    ('며왼띠', '나일론'),
    # 륔틸 → 메틸 (methyl, chemistry). 륔 small sample so compound-only.
    ('륔틸', '메틸'),
]

ALL_REPLACEMENTS = (
    COMMON_REPLACEMENTS
    + FINANCE_REPLACEMENTS
    + RELATION_REPLACEMENTS
    + PLACE_REPLACEMENTS
    + LEGAL_REPLACEMENTS
    + RESIDUAL_TOKEN_REPLACEMENTS
)


def fix_text(text: str) -> str:
    for a, b in ALL_REPLACEMENTS:
        text = text.replace(a, b)

    # Safe cell-level replacements only for fragile kinship tokens
    cell_replacements = {
        '|본외|': '|본인|',
        '|묰우욐|': '|배우자|',
        '|욥남|': '|장남|',
        '|욥끀|': '|장녀|',
        '|릨|': '|부친|',
        '|벀|': '|모친|',
    }
    for a, b in cell_replacements.items():
        text = text.replace(a, b)

    # Safe token replacements with separators only
    token_patterns = [
        (r'(?<=\|)본외(?=\|)', '본인'),
        (r'(?<=\|)묰우욐(?=\|)', '배우자'),
        (r'(?<=\|)욥남(?=\|)', '장남'),
        (r'(?<=\|)욥끀(?=\|)', '장녀'),
        (r'(?<=\|)릨(?=\|)', '부친'),
        (r'(?<=\|)벀(?=\|)', '모친'),
        (r'본외과의 가계', '본인과의 관계'),
        (r'벀동산에 관한 규정왴 준용되는 권리앀', '부동산에 관한 규정이 준용되는 권리'),
        (r'건물욄눀채무', '건물임대채무'),
        (r'욠원동', '잠원동'),
        (r'쀜빙고동', '서빙고동'),
        (r'우체걭', '우체국'),
        (r'한걭카카씤은행\(주\)', '한국카카오은행(주)'),
    ]
    for pattern, repl in token_patterns:
        text = re.sub(pattern, repl, text)

    # Focused pattern-level fixes for top residual tokens
    focused_patterns = [
        (r'(?m)^본외(?=\|)', '본인'),
        (r'(?m)^본외(?= \|)', '본인'),
        (r'(?<=\|)본외(?=\|)', '본인'),
        (r'(?<=\|)본외(?= \|)', '본인'),
        (r'(?m)^묰우욐(?=\|)', '배우자'),
        (r'(?m)^묰우욐(?= \|)', '배우자'),
        (r'(?<=\|)묰우욐(?=\|)', '배우자'),
        (r'(?<=\|)묰우욐(?= \|)', '배우자'),
        (r'(?m)^욥끀(?=\|)', '장녀'),
        (r'(?m)^욥끀(?= \|)', '장녀'),
        (r'(?m)^욥남(?=\|)', '장남'),
        (r'(?m)^욥남(?= \|)', '장남'),
        (r'(?m)^릨(?=\|)', '부친'),
        (r'(?m)^릨(?= \|)', '부친'),
        (r'본외과의 가계', '본인과의 관계'),
        (r'묰우욐 \|', '배우자 |'),
        (r'본외 \|', '본인 |'),
        (r'본외\|', '본인|'),
        (r'욥끀 \|', '장녀 |'),
        (r'욥끀\|', '장녀|'),
        (r'욥남 \|', '장남 |'),
        (r'욥남\|', '장남|'),
        (r'릨 \|', '부친 |'),
        (r'릨\|', '부친|'),
        (r'벀 \|', '모친 |'),
        (r'벀\|', '모친|'),
        (r'한걭카카씤은행\(주\)', '한국카카오은행(주)'),
        (r'한걭카카씤 은행\(주\)', '한국카카오은행(주)'),
        (r'눀신좝게', '대신증권'),
        (r'쀜빙고동', '서빙고동'),
        (r'얩외시', '용인시'),
        (r'기업생명보험', 'IBK연금보험'),
        (r'벀동산에 관한 규정왴 준용되는 권리앀', '부동산에 관한 규정이 준용되는 권리'),
        (r'자동차·건쀤괰계·쀠묕', '자동차·건설기계·선박'),
        (r'항공괰\(삌계\)', '항공기(합계)'),
        (r'삌재지 르면적 등 권리의 명세', '소재지·면적 등 권리의 명세'),
        (r'벀벀 공동릅의', '부부 공동명의'),
        (r'신얩공직사업벀', '신협공제사업본부'),
        (r'의료시쀤', '오피스텔'),
        (r'씤피스큔', '오피스텔'),
        (r'위쀸\(욄차\)게', '임차권'),
        (r'상프동', '상현동'),
        (r'퍸롴지씤시티', '포레시안시티'),
        (r'항공괰\(합계\)', '항공기(합계)'),
        (r'푭공괰\(합계\)', '항공기(합계)'),
        (r'벀동산에 가표 규정왴 저얩댘놔 권리앀 자동차·건설기계·선박 및 항공기\(합계\)', '부동산에 관한 규정이 준용되는 권리 자동차·건설기계·선박 및 항공기(합계)'),
        (r'벀동산에 가표 규정왴 저얩댘놔 권리앀 자동차·건설기계·선박 및 푭공괰\(합계\)', '부동산에 관한 규정이 준용되는 권리 자동차·건설기계·선박 및 항공기(합계)'),
        (r'벀동산에', '부동산에'),
        (r'규정왴', '규정이'),
        (r'저얩댘놔', '준용되는'),
        (r'권리앀', '권리'),
    ]
    for pattern, repl in focused_patterns:
        text = re.sub(pattern, repl, text)

    # v3 regex patterns — context-specific number compounds
    v3_patterns = [
        # 6묀뢬미퀰 → 6개월미만 (묀=개, 뢬=월, 퀰=만); covers 4.75묀뢬미퀰 etc.
        (r'(\d+(?:\.\d+)?)묀뢬미퀰', r'\1개월미만'),
        (r'(\d+(?:\.\d+)?)묀뢬미만', r'\1개월미만'),
        # v4: year suffix — 2020끄 → 2020년 (끄=년 only in year context;
        # standalone 끄 is valid Korean in 매끄러운/미끄럼/끈 so global sub unsafe)
        (r'(\d{4})끄', r'\1년'),
        (r'(\d{4})\s*끄도', r'\1년도'),
    ]
    for pattern, repl in v3_patterns:
        text = re.sub(pattern, repl, text)

    # Global single-char substitutions for OCR-garbage Hangul syllables
    # that are (a) virtually never valid modern Korean and (b) consistently
    # map to a single target in the corpus. Verified via analyze_char_ambiguity
    # and dump_char_contexts. Runs LAST so phrase-level rules above have
    # first dibs.
    single_char_final = [
        ('걭', '국'), ('눀', '대'), ('걬', '구'), ('걐', '교'), ('괈', '금'),
        ('햌', '회'), ('쀜', '서'), ('쵴', '카'), ('찈', '초'), ('얩', '용'),
        ('쀤', '설'), ('쀸', '세'), ('씈', '예'), ('욄', '임'), ('욥', '장'),
        ('왘', '의'), ('좝', '증'), ('욐', '자'), ('먴', '무'), ('벀', '부'),
        ('풉', '행'), ('툌', '파'), ('죀', '지'), ('씤', '오'), ('푭', '항'),
        ('쵘', '치'), ('댘', '되'), ('롘', '류'), ('뉰', '데'), ('띯', '롯'),
        ('묰', '배'), ('삍', '속'), ('펈', '품'), ('삐', '손'), ('푴', '해'),
        # v2: new safe chars verified via corpus top-tokens
        ('놔', '는'), ('푘', '하'), ('꾘', '며'), ('륰', '며'), ('옼', '으'),
        ('띜', '로'), ('픑', '협'), ('댜', '되'), ('욈', '있'), ('씁', '소'),
        ('뿁', '상'),
        # v3: additional verified chars
        ('욅', '입'),
        # v4: verified via residuals-v4.tsv neighbor distribution scan.
        # 옄 → 위: 관옄→관장 (single compound conflict) runs in COMMON_REPLACEMENTS
        # first; 0 instances of 관옄 in 5000-file sample confirmed after.
        # 뮈 → 번: all BEFORE contexts (록/르/구/좌/순/가/지) map to 번 sense;
        # AFTER contexts all compound to 번호/번지.
        # 픸 → 호: all BEFORE (뮈/번/변/각/보/상/양) and AFTER (호에/호의/호가)
        # compound to 호 sense.
        ('옄', '위'),
        ('뮈', '번'),
        ('픸', '호'),
        # v5: verified via residuals-v5.tsv neighbor distribution scan.
        # 왴 → 이 (subject particle + 이 prefix): 1961 neighbors, ~all → 이.
        # 왴푘/왴뿁/왴꾘/왴병/왴저픑/왴승윕 phrase compounds run in pass-1
        # ALL_REPLACEMENTS BEFORE this single-char runs. Safe.
        # 앀 → 외: 177 neighbors, majority → 외 (왴앀=이외, 앀의=외의,
        # 앀옠=외유). Note: distinct char from 앸 which also maps to 외.
        # 솤 → 스 / 큌 → 테 / 롴 → 르 / 퐄 → 프: consistently loanwords
        # (폴리에스테르/플라스틱/펌프/골프/램프/앰프/프로/프랑/프라/데시벨
        # /메가파스칼 etc). All neighbors verified single-mapping.
        # 퐄 has 5806 neighbors — biggest single-char win this round.
        ('왴', '이'),
        ('앀', '외'),
        ('솤', '스'),
        ('큌', '테'),
        ('롴', '르'),
        ('퐄', '프'),
        # v6: 뵄 → 비. 578 neighbors verified (뵄고/뵄상/뵄생/뵄스/뵄서/뵄외,
        # 설뵄/한뵄/회뵄/원뵄 etc — all 비 sense). 뵄쿀민→비타민 compound
        # runs in pass-1 before this single-char, so 비타민 protected.
        ('뵄', '비'),
        # v7: 죁 → 직. Small sample (39 neighbors) but 100% consistent
        # (퇴죁/순죁/이죁/무죁/죁업/죁인/죁접/죁종/죁위/죁군/죁무 — all 직).
        # 죁물 → 직물 (HS textile) 2179건 covered by this.
        # 틉죁물 → 평직물 compound runs pass-1 first so 평직물 intact.
        ('죁', '직'),
    ]
    for a, b in single_char_final:
        text = text.replace(a, b)

    # Second pass of phrase-level replacements: catches tokens whose
    # residual form only emerges *after* single_char_final runs (e.g.
    # 옄쵘 → 옄치 → 위치).
    for a, b in ALL_REPLACEMENTS:
        text = text.replace(a, b)

    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r'[ \t]+\n', '\n', text)
    text = re.sub(r'([가-힣])\|([가-힣])', r'\1 | \2', text)
    return text.strip() + '\n'


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    written = 0
    for p in sorted(SRC.rglob('*.md')):
        text = p.read_text(encoding='utf-8', errors='ignore')
        corrected = fix_text(text)
        rel = p.relative_to(SRC)
        out = OUT / rel
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(corrected, encoding='utf-8')
        written += 1
    print('WRITTEN', written)


if __name__ == '__main__':
    main()
