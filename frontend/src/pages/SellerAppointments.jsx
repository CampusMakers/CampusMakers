import {
    sellerAppointments,
    sellerEvents
} from "./mockProfileData";

function SellerAppointments({ onDemoAction }) {
    return (
        <div className="profile-content-stack">
            {/* SELLER APPOINTMENTS */}
            <section className="profile-panel">
                <div className="profile-panel-heading">
                    <h3>Your Appointments</h3>
                    <span className="profile-count">
                        {sellerAppointments.length} active
                    </span>
                </div>

                <div className="profile-card-stack">
                    {sellerAppointments.map((appointment) => (
                        <article
                            className="profile-appointment-card"
                            key={appointment.id}>
                            <div className="profile-appointment-top">
                                {appointment.image ? (
                                    <img
                                        className="profile-appointment-photo"
                                        src={appointment.image}
                                        alt={appointment.title}
                                    />
                                ) : (
                                    <div className="profile-appointment-photo profile-photo-placeholder">
                                        CM
                                    </div>
                                )}

                                <div className="profile-appointment-details">
                                    <h4>{appointment.title}</h4>
                                    <p>
                                        Buyer:{" "}
                                        <strong>
                                            {appointment.buyer}
                                        </strong>
                                    </p>
                                </div>
                            </div>

                            <div className="profile-appointment-meta">
                                <p>
                                    <strong>When:</strong>{" "}
                                    {appointment.date}
                                </p>
                                <p>
                                    <strong>Where:</strong>{" "}
                                    {appointment.location}
                                </p>
                            </div>

                            <div className="profile-appointment-payment">
                                <span>
                                    {appointment.payment}
                                </span>
                                <strong>
                                    $
                                    {appointment.price.toFixed(
                                        2
                                    )}
                                </strong>
                            </div>

                            <span
                                className={`profile-status ${
                                    appointment.status ===
                                    "Confirmed"
                                        ? "profile-status-confirmed"
                                        : "profile-status-pending"
                                }`}>
                                {appointment.status}
                            </span>

                            <div className="profile-appointment-actions">
                                <button
                                    type="button"
                                    className="profile-action-button profile-action-primary"
                                    onClick={() =>
                                        onDemoAction(
                                            appointment.primaryAction
                                        )
                                    }>
                                    {appointment.primaryAction}
                                </button>

                                <button
                                    type="button"
                                    className="profile-action-button"
                                    onClick={() =>
                                        onDemoAction(
                                            appointment.secondaryAction
                                        )
                                    }>
                                    {
                                        appointment.secondaryAction
                                    }
                                </button>
                            </div>
                        </article>
                    ))}
                </div>
            </section>

            {/* SELLER EVENTS */}
            <section className="profile-panel">
                <div className="profile-panel-heading">
                    <h3>Upcoming Events & Pop-ups</h3>
                    <span className="profile-count">
                        {sellerEvents.length} events
                    </span>
                </div>

                <div className="profile-card-stack">
                    {sellerEvents.map((event) => (
                        <article
                            className="profile-event-card"
                            key={event.id}>
                            <div className="profile-event-main">
                                <div className="profile-event-date">
                                    <span>{event.month}</span>
                                    <strong>{event.day}</strong>
                                </div>

                                <div className="profile-event-details">
                                    <h4>{event.title}</h4>
                                    <p>{event.date}</p>
                                    <p>{event.location}</p>
                                </div>
                            </div>

                            <div className="profile-event-footer">
                                <span className="profile-event-role">
                                    {event.role}
                                </span>
                                <p>{event.description}</p>
                            </div>

                            <button
                                type="button"
                                className="profile-action-button profile-event-button"
                                onClick={() =>
                                    onDemoAction(event.action)
                                }>
                                {event.action}
                            </button>
                        </article>
                    ))}
                </div>
            </section>

            <div className="profile-tip">
                <strong>Campus Hand-off Tip</strong>
                <p>
                    Meet buyers at recognizable campus locations
                    and confirm the hand-off before marking an
                    order complete.
                </p>
            </div>
        </div>
    );
}

export default SellerAppointments;
