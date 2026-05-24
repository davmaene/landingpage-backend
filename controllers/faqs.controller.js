const { Faq } = require('../models');
const { Response } = require('../utils/Response');

exports.list = async (req, res) => {
  const items = await Faq.findAll({
    where: { isActive: true },
    order: [['sortOrder', 'ASC'], ['id', 'ASC']],
  });
  return Response(res, 200, { length: items.length, rows: items });
};

exports.adminList = async (req, res) => {
  const items = await Faq.findAll({ order: [['sortOrder', 'ASC'], ['id', 'ASC']] });
  return Response(res, 200, { length: items.length, rows: items });
};

exports.create = async (req, res) => {
  try {
    const { question, questionEn, answer, answerEn, sortOrder, isActive } = req.body;
    if (!question?.trim() || !answer?.trim())
      return Response(res, 401, { reason: 'Question et réponse requises' });
    let order = sortOrder;
    if (order === undefined || order === null || order === '') {
      const max = await Faq.max('sortOrder');
      order = (max || 0) + 1;
    }
    const item = await Faq.create({
      question: question.trim(),
      questionEn: questionEn?.trim() || null,
      answer: answer.trim(),
      answerEn: answerEn?.trim() || null,
      sortOrder: Number(order) || 0,
      isActive: isActive !== false,
    });
    return Response(res, 201, { item });
  } catch (e) {
    return Response(res, 500, { reason: e.message });
  }
};

exports.update = async (req, res) => {
  try {
    const item = await Faq.findByPk(req.params.id);
    if (!item) return Response(res, 404, { reason: 'FAQ introuvable' });
    const { question, questionEn, answer, answerEn, sortOrder, isActive } = req.body;
    if (question !== undefined) item.question = String(question).trim();
    if (questionEn !== undefined) item.questionEn = questionEn?.trim() || null;
    if (answer !== undefined) item.answer = String(answer).trim();
    if (answerEn !== undefined) item.answerEn = answerEn?.trim() || null;
    if (sortOrder !== undefined) item.sortOrder = Number(sortOrder) || 0;
    if (isActive !== undefined) item.isActive = !!isActive;
    if (!item.question || !item.answer)
      return Response(res, 401, { reason: 'Question et réponse requises' });
    await item.save();
    return Response(res, 200, { item });
  } catch (e) {
    return Response(res, 500, { reason: e.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const item = await Faq.findByPk(req.params.id);
    if (!item) return Response(res, 404, { reason: 'FAQ introuvable' });
    await item.destroy();
    return Response(res, 200, { deleted: true });
  } catch (e) {
    return Response(res, 500, { reason: e.message });
  }
};
