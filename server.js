const express = require('express');
const app = express();

app.use(express.json());

const a = Array.from({ length: 20000 }, (_, index) => index + 1);

class Queue {
  constructor(concurrency) {
    this.concurrency = concurrency; // 限制同時執行的任務數量
    this.queue = []; // 保存所有的任務
    this.running = 0; // 當前執行中的任務數量
  }

  // 添加任務到 Queue
  add(task) {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await task(); // 執行任務
          resolve(result); // 任務成功
        } catch (error) {
          reject(error); // 任務失敗
        } finally {
          this.running--; // 完成後減少執行數量
          this._next(); // 啟動下一個任務
        }
      });

      this._next(); // 如果有空閒位置，啟動任務
    });
  }

  // 執行下一個任務
  _next() {
    if (this.running >= this.concurrency || this.queue.length === 0) {
      return; // 達到併發限制或沒有任務
    }

    const task = this.queue.shift(); // 取出一個任務
    this.running++; // 增加執行中的任務數量
    task(); // 執行任務
  }
}

// 虛擬的處理函數（模擬耗時操作）
const processItem = (item) => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(item * 2), 10); // 模擬處理時間
  });
};

// 使用 Promise.all 和 queue
app.post('/process-with-queue', async (req, res) => {
  console.time('Execution Time - Queue'); // 記錄開始時間
  const array = a; // 假設傳入的 array 是位於 body

  if (!Array.isArray(array) || array.length === 0) {
    return res.status(400).json({ error: 'Invalid input array' });
  }

  const concurrency = 50; // 每次最多處理 50 個任務, 可以根據需要調整, 例如 DB pool size
  const queue = new Queue(concurrency); // 初始化 Queue
  const results = []; // 保存處理結果

  try {
    // 將每個任務加入 Queue
    await Promise.all(
      array.map((item) =>
        queue.add(async () => {
          const result = await processItem(item); // 假設 processItem 是處理單一項目的方法
          results.push(result); // 保存結果
        })
      )
    );

    console.timeEnd('Execution Time - Queue'); // 記錄結束時間
    res.json({ results }); // 返回處理結果
  } catch (error) {
    console.timeEnd('Execution Time - Queue');
    console.error('Error processing items:', error);
    res.status(500).json({ error: 'An error occurred during processing' });
  }
});

// 使用 loop 處理
app.post('/process-with-loop', async (req, res) => {
  console.time('Execution Time - None Queue'); // 記錄開始時間
  const array = a

  if (!Array.isArray(array) || array.length === 0) {
    return res.status(400).json({ error: 'Invalid input array' });
  }

  const results = [];

  for (const item of array) {
    const result = await processItem(item); // 每次處理一個
    results.push(result);
  }
  console.timeEnd('Execution Time - None Queue'); // 記錄開始時間
  res.json({ results });
});

// 啟動伺服器
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

