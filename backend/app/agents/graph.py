from langgraph.graph import StateGraph, END
from app.agents.state import LearningState
from app.agents.nodes import (
    generate_roadmap_node,
    generate_lesson_node,
    generate_quiz_node,
    evaluate_answers_node,
    feynman_explanation_node,
    complete_checkpoint_node,
)


def build_learning_graph() -> StateGraph:
    graph = StateGraph(LearningState)

    graph.add_node("generate_roadmap", generate_roadmap_node)
    graph.add_node("generate_lesson", generate_lesson_node)
    graph.add_node("generate_quiz", generate_quiz_node)
    graph.add_node("evaluate_answers", evaluate_answers_node)
    graph.add_node("feynman_explanation", feynman_explanation_node)
    graph.add_node("complete_checkpoint", complete_checkpoint_node)

    graph.set_entry_point("generate_roadmap")

    graph.add_conditional_edges(
        "generate_roadmap",
        lambda s: s.get("action", "done"),
        {"teach": "generate_lesson", "done": END},
    )

    graph.add_conditional_edges(
        "generate_lesson",
        lambda s: s.get("action", "done"),
        {"quiz": "generate_quiz", "teach": "generate_lesson", "done": END},
    )

    # Quiz waits for user answers - pause here
    graph.add_edge("generate_quiz", END)

    graph.add_conditional_edges(
        "evaluate_answers",
        lambda s: s.get("action", "done"),
        {
            "complete_checkpoint": "complete_checkpoint",
            "feynman": "feynman_explanation",
            "done": END,
        },
    )

    # Feynman pauses for user to read and then retest
    graph.add_edge("feynman_explanation", END)

    graph.add_conditional_edges(
        "complete_checkpoint",
        lambda s: s.get("action", "done"),
        {"teach": "generate_lesson", "done": END},
    )

    return graph.compile()


learning_graph = build_learning_graph()
