export async function onRequestPost(context) {
  const { request, env } = context;
  const { username, password } = await request.json();

  // 查询数据库
  const user = await env.DB.prepare(
    'SELECT * FROM users WHERE username = ? AND password = ?'
  ).bind(username, password).first();

  if (user) {
    return Response.json({ success: true, username: user.username });
  } else {
    return Response.json({ success: false, message: '用户名或密码错误' }, { status: 401 });
  }
}