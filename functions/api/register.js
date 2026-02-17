export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return Response.json({ success: false, message: '请输入用户名和密码' }, { status: 400 });
    }

    // 尝试插入数据库
    const result = await env.DB.prepare(
      'INSERT INTO users (username, password) VALUES (?, ?)'
    ).bind(username, password).run();

    if (result.success) {
      return Response.json({ success: true, message: '注册成功' });
    } else {
      throw new Error('数据库错误');
    }
  } catch (err) {
    // 捕获唯一性约束错误 (用户名已存在)
    return Response.json({ success: false, message: '用户名已存在或系统错误' }, { status: 409 });
  }
}