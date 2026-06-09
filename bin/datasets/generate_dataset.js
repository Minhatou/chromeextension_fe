const fs = require('fs');

const data = [
    {
        "english": "The architectural transition from a monolithic application to a microservices-based ecosystem requires careful consideration of data consistency, service discovery, and inter-service communication through robust messaging protocols like gRPC or asynchronous event buses such as Apache Kafka.",
        "vietnamese": "Quá trình chuyển đổi kiến trúc từ một ứng dụng đơn khối (monolithic) sang hệ sinh thái dựa trên các dịch vụ siêu nhỏ (microservices) đòi hỏi sự cân nhắc kỹ lưỡng về tính nhất quán của dữ liệu, khả năng phát hiện dịch vụ và giao tiếp liên dịch vụ thông qua các giao thức truyền tin mạnh mẽ như gRPC hoặc các bus sự kiện bất đồng bộ như Apache Kafka."
    },
    {
        "english": "Implementing a Zero Trust security model involves continuously verifying every user and device, regardless of whether they are inside or outside the corporate network, utilizing multi-factor authentication, strictly enforced identity access management policies, and real-time monitoring of network traffic.",
        "vietnamese": "Việc triển khai mô hình bảo mật Zero Trust bao gồm việc liên tục xác minh mọi người dùng và thiết bị, bất kể họ ở trong hay ngoài mạng doanh nghiệp, sử dụng xác thực đa yếu tố, các chính sách quản lý quyền truy cập danh tính được thực thi nghiêm ngặt và giám sát lưu lượng mạng theo thời gian thực."
    },
    {
        "english": "Optimizing React performance in large-scale applications often necessitates the strategic use of memoization techniques like useMemo and useCallback to prevent unnecessary re-renders of complex component trees that can degrade the user experience during frequent state updates.",
        "vietnamese": "Tối ưu hóa hiệu suất React trong các ứng dụng quy mô lớn thường đòi hỏi việc sử dụng chiến lược các kỹ thuật ghi nhớ (memoization) như useMemo và useCallback để ngăn chặn việc render lại không cần thiết của các cây thành phần phức tạp vốn có thể làm giảm trải nghiệm người dùng trong quá trình cập nhật trạng thái thường xuyên."
    },
    {
        "english": "Modern large language models, such as Llama-3 and Gemma, leverage transformer architectures with multi-head attention mechanisms that allow them to process vast amounts of textual data and capture intricate linguistic dependencies across long contexts for tasks like summarization and translation.",
        "vietnamese": "Các mô hình ngôn ngữ lớn hiện đại, như Llama-3 và Gemma, tận dụng kiến trúc transformer với cơ chế chú ý đa đầu (multi-head attention) cho phép chúng xử lý một lượng lớn dữ liệu văn bản và nắm bắt các phụ thuộc ngôn ngữ phức tạp trong các ngữ cảnh dài cho các tác vụ như tóm tắt và dịch thuật."
    },
    {
        "english": "Container orchestration platforms like Kubernetes facilitate the automated deployment, scaling, and management of containerized applications by abstracting away the underlying infrastructure and providing features like self-healing, rolling updates, and service load balancing.",
        "vietnamese": "Các nền tảng điều phối container như Kubernetes tạo điều kiện cho việc triển khai, mở rộng và quản lý tự động các ứng dụng được đóng gói trong container bằng cách trừu tượng hóa cơ sở hạ tầng bên dưới và cung cấp các tính năng như tự chữa lành (self-healing), cập nhật cuốn chiếu (rolling updates) và cân bằng tải dịch vụ."
    },
    {
        "english": "Continuous Integration and Continuous Deployment (CI/CD) pipelines are essential for modern software development as they automate the building, testing, and deployment processes, enabling teams to deliver high-quality features and bug fixes to production with increased frequency and reliability.",
        "vietnamese": "Các luồng tích hợp liên tục và triển khai liên tục (CI/CD) là thiết yếu cho phát triển phần mềm hiện đại vì chúng tự động hóa các quy trình xây dựng, kiểm thử và triển khai, cho phép các nhóm cung cấp các tính năng chất lượng cao và các bản vá lỗi lên môi trường production với tần suất và độ tin cậy tăng cao."
    },
    {
        "english": "Deep learning models, particularly convolutional neural networks, have revolutionized computer vision by enabling high-accuracy image classification, object detection, and semantic segmentation through the hierarchical extraction of features from raw pixel data.",
        "vietnamese": "Các mô hình học sâu, đặc biệt là mạng thần kinh tích chập (CNN), đã cách mạng hóa thị giác máy tính bằng cách cho phép phân loại hình ảnh, phát hiện đối tượng và phân đoạn ngữ nghĩa với độ chính xác cao thông qua việc trích xuất các đặc trưng phân cấp từ dữ liệu pixel thô."
    },
    {
        "english": "Serverless computing models, such as AWS Lambda or Google Cloud Functions, allow developers to build and run applications without managing servers, as the cloud provider automatically handles the provisioning, scaling, and maintenance of the underlying compute resources.",
        "vietnamese": "Các mô hình điện toán không máy chủ (serverless), như AWS Lambda hoặc Google Cloud Functions, cho phép các nhà phát triển xây dựng và chạy các ứng dụng mà không cần quản lý máy chủ, vì nhà cung cấp đám mây tự động xử lý việc cấp phát, mở rộng và bảo trì các tài nguyên tính toán bên dưới."
    },
    {
        "english": "Blockchain technology provides a decentralized and immutable ledger for recording transactions across a peer-to-peer network, ensuring transparency and security through cryptographic hashing and consensus mechanisms like Proof of Work or Proof of Stake.",
        "vietnamese": "Công nghệ blockchain cung cấp một sổ cái phi tập trung và bất biến để ghi lại các giao dịch trên mạng ngang hàng, đảm bảo tính minh bạch và bảo mật thông qua băm mật mã và các cơ chế đồng thuận như Proof of Work hoặc Proof of Stake."
    },
    {
        "english": "Database sharding is a horizontal partitioning technique that distributes data across multiple database instances to improve performance and scalability by reducing the load on individual nodes and enabling parallel processing of queries.",
        "vietnamese": "Phân mảnh cơ sở dữ liệu (sharding) là một kỹ thuật phân vùng ngang giúp phân phối dữ liệu qua nhiều thực thể cơ sở dữ liệu để cải thiện hiệu suất và khả năng mở rộng bằng cách giảm tải cho các nút riêng lẻ và cho phép xử lý song song các truy vấn."
    },
    {
        "english": "Edge computing pushes computational processes closer to the data source, such as IoT devices or local edge servers, to reduce latency, minimize bandwidth usage, and enable real-time analysis for time-sensitive applications like autonomous vehicles or industrial automation.",
        "vietnamese": "Điện toán biên (edge computing) đẩy các quy trình tính toán lại gần nguồn dữ liệu hơn, chẳng hạn như các thiết bị IoT hoặc máy chủ biên cục bộ, để giảm độ trễ, giảm thiểu sử dụng băng thông và cho phép phân tích thời gian thực cho các ứng dụng nhạy cảm về thời gian như xe tự hành hoặc tự động hóa công nghiệp."
    },
    {
        "english": "Quantum computing leverages the principles of quantum mechanics, including superposition and entanglement, to perform complex calculations that are currently infeasible for classical computers, potentially revolutionizing fields like cryptography, materials science, and drug discovery.",
        "vietnamese": "Điện toán lượng tử tận dụng các nguyên lý của cơ học lượng tử, bao gồm sự chồng chập (superposition) và vướng víu (entanglement), để thực hiện các tính toán phức tạp mà hiện nay các máy tính cổ điển không thể thực hiện được, có tiềm năng cách mạng hóa các lĩnh vực như mật mã học, khoa học vật liệu và khám phá thuốc."
    },
    {
        "english": "Natural Language Processing (NLP) involves the development of algorithms that enable computers to understand, interpret, and generate human language, facilitating applications such as sentiment analysis, machine translation, and interactive virtual assistants.",
        "vietnamese": "Xử lý ngôn ngữ tự nhiên (NLP) bao gồm việc phát triển các thuật toán cho phép máy tính hiểu, diễn giải và tạo ra ngôn ngữ con người, tạo điều kiện cho các ứng dụng như phân tích cảm xúc, dịch máy và trợ lý ảo tương tác."
    },
    {
        "english": "Infrastructure as Code (IaC) allows DevOps teams to manage and provision infrastructure resources using machine-readable definition files, ensuring consistency, repeatability, and version control across different environments.",
        "vietnamese": "Cơ sở hạ tầng dưới dạng mã (IaC) cho phép các nhóm DevOps quản lý và cấp phát các tài nguyên cơ sở hạ tầng bằng các tệp định nghĩa có thể đọc được bằng máy, đảm bảo tính nhất quán, khả năng lặp lại và kiểm soát phiên bản trên các môi trường khác nhau."
    },
    {
        "english": "GraphQL is a query language for APIs that provides a more efficient and flexible alternative to REST, allowing clients to request exactly the data they need and enabling the retrieval of related resources in a single request.",
        "vietnamese": "GraphQL là một ngôn ngữ truy vấn cho các API, cung cấp một giải pháp thay thế hiệu quả và linh hoạt hơn cho REST, cho phép các client yêu cầu chính xác dữ liệu họ cần và cho phép lấy các tài nguyên liên quan trong một yêu cầu duy nhất."
    },
    {
        "english": "The shift towards Cloud-Native development emphasizes the use of containers, service meshes, and declarative APIs to build applications that are resilient, manageable, and observable, specifically designed to run on modern cloud infrastructure.",
        "vietnamese": "Sự chuyển dịch sang phát triển Cloud-Native nhấn mạnh việc sử dụng container, service mesh và các API khai báo để xây dựng các ứng dụng có khả năng phục hồi, dễ quản lý và có thể quan sát được, được thiết kế đặc biệt để chạy trên cơ sở hạ tầng đám mây hiện đại."
    },
    {
        "english": "Identity and Access Management (IAM) systems ensure that the right individuals have access to the right resources at the right time for the right reasons, providing a centralized framework for managing user identities and permissions.",
        "vietnamese": "Các hệ thống Quản lý Danh tính và Quyền truy cập (IAM) đảm bảo rằng những cá nhân phù hợp có quyền truy cập vào các tài nguyên phù hợp vào đúng thời điểm vì những lý do chính đáng, cung cấp một khung tập trung để quản lý danh tính người dùng và các quyền hạn."
    },
    {
        "english": "Data Lake architectures store large volumes of raw data in its native format, allowing for the flexible storage of structured, semi-structured, and unstructured data that can be processed and analyzed using various big data tools.",
        "vietnamese": "Kiến trúc Hồ dữ liệu (Data Lake) lưu trữ khối lượng lớn dữ liệu thô ở định dạng gốc, cho phép lưu trữ linh hoạt dữ liệu có cấu trúc, bán cấu trúc và không cấu trúc vốn có thể được xử lý và phân tích bằng nhiều công cụ dữ liệu lớn khác nhau."
    },
    {
        "english": "API Gateways act as a single entry point for a group of microservices, handling tasks such as authentication, rate limiting, request routing, and protocol translation to simplify the interaction between clients and backend services.",
        "vietnamese": "Các API Gateway đóng vai trò như một điểm nhập duy nhất cho một nhóm các microservices, xử lý các tác vụ như xác thực, giới hạn tốc độ (rate limiting), định tuyến yêu cầu và chuyển đổi giao thức để đơn giản hóa việc tương tác giữa các client và các dịch vụ backend."
    },
    {
        "english": "Event-driven architecture promotes the production, detection, and consumption of events, enabling decoupled systems to react to state changes in real-time and improving the scalability and responsiveness of complex applications.",
        "vietnamese": "Kiến trúc hướng sự kiện (event-driven architecture) thúc đẩy việc tạo ra, phát hiện và tiêu thụ các sự kiện, cho phép các hệ thống tách rời phản ứng với các thay đổi trạng thái trong thời gian thực và cải thiện khả năng mở rộng cũng như khả năng phản hồi của các ứng dụng phức tạp."
    }
];

const outputFile = 'datasets/it_long_sentences.jsonl';
const stream = fs.createWriteStream(outputFile, { encoding: 'utf8' });

data.forEach(entry => {
    const prompt = `<|im_start|>user\nTranslate the following IT text to Vietnamese. Provide only the translation.\nText: ${entry.english}<|im_end|>\n<|im_start|>assistant\n`;
    const jsonLine = {
        text: `${prompt}${entry.vietnamese}<|im_end|>`
    };
    stream.write(JSON.stringify(jsonLine) + '\n');
});

stream.end();
console.log(`Dataset created with ${data.length} long sentences at ${outputFile}`);
