# **Logic ngày tháng và tiến độ công việc trong quy trình**

## **1\. Nguyên tắc chung**

Hệ thống quản lý quy trình theo cấu trúc cây:

Task  
→ Subtask  
→ Subsubtask

Mặc định, các công việc trong quy trình được thực hiện **tuần tự** theo thứ tự cấu hình. Tuy nhiên, hệ thống cần hỗ trợ cấu hình một số công việc **thực hiện song song**, với điều kiện chỉ cho phép song song giữa các công việc **đồng cấp và cùng cha**.

Cụ thể:

- Task chỉ được song song với Task khác cùng cấp.  
- Subtask chỉ được song song với Subtask khác trong cùng một Task cha.  
- Subsubtask chỉ được song song với Subsubtask khác trong cùng một Subtask cha.

Không cho phép cấu hình song song giữa các cấp khác nhau, ví dụ:

- Task song song với Subtask  
- Subtask song song với Subsubtask  
- Subtask thuộc Task A song song với Subtask thuộc Task B  
- Subsubtask thuộc Subtask A song song với Subsubtask thuộc Subtask B

Mục tiêu là giữ logic quy trình dễ hiểu, tránh mapping phức tạp và tránh sai tiến độ.

---

## **2\. Các loại ngày của công việc**

Mỗi công việc có 4 loại ngày chính:

| Loại ngày | Ý nghĩa |
| ----- | ----- |
| **Ngày bắt đầu dự kiến** | Ngày hệ thống dự kiến công việc bắt đầu |
| **Ngày bắt đầu thực tế** | Ngày công việc thực tế được mở/bắt đầu thực hiện |
| **Ngày kết thúc dự kiến** | Ngày hệ thống dự kiến công việc hoàn thành |
| **Ngày kết thúc thực tế** | Ngày người dùng đánh dấu hoàn thành công việc |

Ngoài ra, mỗi công việc trong quy trình có:

- Số ngày thực hiện  
- Số ngày này được cấu hình trong quy trình và dùng để tính ngày kết thúc dự kiến.

---

## **3\. Logic ngày tháng với quy trình tuần tự**

Với công việc đầu tiên của dự án:

- Ngày bắt đầu dự kiến \= Ngày bắt đầu dự án  
- Ngày bắt đầu thực tế \= Ngày bắt đầu dự án  
- Ngày kết thúc dự kiến \= Ngày bắt đầu dự kiến \+ Số ngày thực hiện  
- Ngày kết thúc thực tế \= Ngày người dùng đánh dấu hoàn thành công việc

Với các công việc sau trong luồng tuần tự:

- Ngày bắt đầu dự kiến của công việc sau \= Ngày bắt đầu dự kiến của công việc trước \+ Số ngày thực hiện của công việc trước  
- Ngày bắt đầu thực tế của công việc sau \= Ngày kết thúc thực tế của công việc trước  
- Ngày kết thúc dự kiến \= Ngày bắt đầu dự kiến \+ Số ngày thực hiện của công việc  
- Ngày kết thúc thực tế \= Ngày người dùng đánh dấu hoàn thành công việc

Nói cách khác, với luồng tuần tự, công việc sau chỉ bắt đầu thực tế khi công việc trước đã hoàn thành.

---

## **4\. Logic ngày tháng với công việc song song đồng cấp**

Khi một nhóm công việc được cấu hình là **song song**, các công việc trong nhóm đó sẽ có cùng mốc bắt đầu theo công việc/nhóm đứng trước.

Ví dụ:

Task 1  
Task 2  
Task 3

Nếu Task 2 và Task 3 được cấu hình song song, thì Task 2 và Task 3 không chạy lần lượt theo kiểu Task 2 xong mới đến Task 3\. Thay vào đó, cả hai cùng bắt đầu từ cùng một mốc.

### **4.1. Ngày bắt đầu dự kiến của nhóm song song**

Các công việc song song cùng cấp sẽ có:

- Ngày bắt đầu dự kiến giống nhau  
- Mốc này được lấy từ logic tuần tự trước đó.

Ví dụ:

Task 1: 5 ngày  
Task 2: 3 ngày  
Task 3: 4 ngày

Nếu Task 2 và Task 3 song song sau Task 1:

- Ngày bắt đầu dự kiến Task 2 \= Ngày bắt đầu dự kiến Task 1 \+ 5 ngày  
- Ngày bắt đầu dự kiến Task 3 \= Ngày bắt đầu dự kiến Task 1 \+ 5 ngày

Không tính: Task 3 bắt đầu sau Task 2 vì Task 2 và Task 3 là song song.

---

### **4.2. Ngày kết thúc dự kiến của từng công việc song song**

Mỗi công việc song song vẫn tự tính ngày kết thúc dự kiến theo số ngày riêng của nó:

Ngày kết thúc dự kiến \= Ngày bắt đầu dự kiến \+ Số ngày thực hiện của chính công việc đó

Ví dụ:

Task 2: bắt đầu 01/05, số ngày \= 3 → kết thúc dự kiến 04/05  
Task 3: bắt đầu 01/05, số ngày \= 4 → kết thúc dự kiến 05/05  
---

### **4.3. Ngày bắt đầu thực tế của nhóm song song**

Khi công việc trước nhóm song song hoàn thành, các công việc trong nhóm song song được mở cùng lúc.

Ngày bắt đầu thực tế của các công việc song song \= Ngày kết thúc thực tế của công việc/nhóm tiền nhiệm

Ví dụ:

- Task 1 hoàn thành thực tế ngày 10/05  
- Task 2 và Task 3 song song sau Task 1

Khi đó:

- Ngày bắt đầu thực tế Task 2 \= 10/05  
- Ngày bắt đầu thực tế Task 3 \= 10/05

---

## **5\. Logic sau một nhóm song song**

Nếu sau nhóm song song có công việc tiếp theo, công việc tiếp theo chỉ được bắt đầu khi **toàn bộ công việc bắt buộc trong nhóm song song đã hoàn thành**.

Ví dụ:

Task 1  
Task 2 và Task 3 song song  
Task 4

Task 4 chỉ được mở khi cả Task 2 và Task 3 đã hoàn thành.

### **5.1. Ngày bắt đầu dự kiến của công việc sau nhóm song song**

Ngày bắt đầu dự kiến của công việc sau nhóm song song được tính theo ngày kết thúc dự kiến muộn nhất trong nhóm song song.

Ngày bắt đầu dự kiến của công việc sau nhóm song song \= Max(Ngày kết thúc dự kiến của các công việc trong nhóm song song)

Ví dụ:

- Task 2 kết thúc dự kiến: 04/05  
- Task 3 kết thúc dự kiến: 05/05

Thì:

Ngày bắt đầu dự kiến Task 4 \= 05/05

### **5.2. Ngày bắt đầu thực tế của công việc sau nhóm song song**

- Ngày bắt đầu thực tế của công việc sau nhóm song song được tính theo ngày hoàn thành thực tế muộn nhất trong nhóm song song.  
- Ngày bắt đầu thực tế của công việc sau nhóm song song \= Max(Ngày kết thúc thực tế của các công việc trong nhóm song song)

Ví dụ:

- Task 2 hoàn thành thực tế: 06/05  
- Task 3 hoàn thành thực tế: 08/05

Thì: Ngày bắt đầu thực tế Task 4 \= 08/05

---

## **6\. Logic áp dụng cho từng cấp**

Logic song song áp dụng giống nhau cho từng cấp, nhưng chỉ trong phạm vi cùng cha.

### **6.1. Song song cấp Task**

Các Task song song phải cùng cấp trong một quy trình dự án.

Task 2 song song Task 3

Công việc sau nhóm song song chỉ mở khi các Task song song bắt buộc đã hoàn thành.

### **6.2. Song song cấp Subtask**

Các Subtask chỉ được song song nếu cùng thuộc một Task cha.

Task 1  
→ Subtask 1.1  
→ Subtask 1.2

Subtask 1.1 và Subtask 1.2 có thể song song với nhau.

Không cho phép:

Subtask 1.1 thuộc Task 1 song song với Subtask 2.1 thuộc Task 2

### **6.3. Song song cấp Subsubtask**

Các Subsubtask chỉ được song song nếu cùng thuộc một Subtask cha.

Task 1  
→ Subtask 1.1  
  → Subsubtask 1.1.1  
  → Subsubtask 1.1.2

Subsubtask 1.1.1 và 1.1.2 có thể song song với nhau.

Không cho phép song song với Subsubtask thuộc Subtask khác.

---

## **7\. Logic đánh giá tiến độ**

### **7.1. Công việc đã hoàn thành**

Nếu công việc đã có **Ngày kết thúc thực tế**:

- Nếu Ngày kết thúc thực tế \<= Ngày kết thúc dự kiến → Đúng tiến độ  
- Nếu Ngày kết thúc thực tế \> Ngày kết thúc dự kiến → Chậm tiến độ

---

### **7.2. Công việc đang thực hiện**

Nếu công việc chưa có **Ngày kết thúc thực tế** nhưng đã bắt đầu thực hiện:

- Nếu Ngày hiện tại \<= Ngày kết thúc dự kiến → Đúng tiến độ  
- Nếu Ngày hiện tại \> Ngày kết thúc dự kiến → Chậm tiến độ

---

### **7.3. Công việc chưa thực hiện**

Nếu công việc chưa bắt đầu thực hiện: Không đánh giá tiến độ

Và hiển thị: \-

Không nên gắn nhãn đúng tiến độ/chậm tiến độ khi công việc chưa được mở hoặc chưa bắt đầu.

---

## **8\. Rule cấu hình song song**

Khi Admin setup quy trình, hệ thống cần cho phép đánh dấu các công việc đồng cấp là song song.

### **8.1. Điều kiện được chọn song song**

Chỉ cho phép chọn song song khi các công việc:

- Cùng cấp  
- Cùng cha  
- Cùng loại quy trình

Ví dụ hợp lệ:

- Task 2 song song Task 3  
- Subtask 1.1 song song Subtask 1.2 trong cùng Task 1  
- Subsubtask 1.1.1 song song Subsubtask 1.1.2 trong cùng Subtask 1.1

Ví dụ không hợp lệ:

- Task song song với Subtask  
- Subtask khác Task cha  
- Subsubtask khác Subtask cha

