const slugify = require('slugify');
const { Faq } = require('../models');
const { Response } = require('../utils/Response');

function buildSlug(question, id) {
  const base = slugify(String(question || 'faq'), { lower: true, strict: true }) || 'faq';
  return `${base}-${id}`;
}

async function ensureSlug(item) {
  if (!item.slug) {
    item.slug = buildSlug(item.question, item.id);
    await item.save();
  }
  return item;
}

exports.list = async (req, res) => {
  const items = await Faq.findAll({
    where: { isActive: true },
    order: [['sortOrder', 'ASC'], ['id', 'ASC']],
  });
  await Promise.all(items.map(ensureSlug));
  return Response(res, 200, { length: items.length, rows: items });
};

exports.adminList = async (req, res) => {
  const items = await Faq.findAll({ order: [['sortOrder', 'ASC'], ['id', 'ASC']] });
  await Promise.all(items.map(ensureSlug));
  return Response(res, 200, { length: items.length, rows: items });
};

exports.getBySlug = async (req, res) => {
  const item = await Faq.findOne({ where: { slug: req.params.slug, isActive: true } });
  if (!item) return Response(res, 404, { reason: 'FAQ introuvable' });
  return Response(res, 200, { item });
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
    item.slug = buildSlug(item.question, item.id);
    await item.save();
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
    if (question !== undefined && question.trim() !== item.question) {
      item.question = question.trim();
      item.slug = buildSlug(item.question, item.id);
    }
    if (questionEn !== undefined) item.questionEn = questionEn?.trim() || null;
    if (answer !== undefined) item.answer = String(answer).trim();
    if (answerEn !== undefined) item.answerEn = answerEn?.trim() || null;
    if (sortOrder !== undefined) item.sortOrder = Number(sortOrder) || 0;
    if (isActive !== undefined) item.isActive = !!isActive;
    if (!item.question || !item.answer)
      return Response(res, 401, { reason: 'Question et réponse requises' });
    if (!item.slug) item.slug = buildSlug(item.question, item.id);
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
